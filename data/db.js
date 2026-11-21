const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { initialCategories, initialMenuItems, initialTables, initialStaff } = require('./initialMenu');

const DB_FILE = path.join(__dirname, 'store.json');

class SmartDineDatabase {
  constructor() {
    this.data = {
      restaurant: {
        name: "Gajanan Hotel - SmartDine Luxury",
        tagline: "Authentic Desi Flavors & Royal Hospitality",
        address: "Main Highway Road, Near City Center, Jaipur, Rajasthan",
        phone: "+91 98765 43210",
        email: "contact@gajananhotel.com",
        gst: "08AAAAA0000A1Z5",
        taxPercentage: 5.00
      },
      categories: [...initialCategories],
      menuItems: [...initialMenuItems],
      tables: [...initialTables],
      staff: [...initialStaff],
      orders: [],
      orderHistory: [],
      payments: [],
      counters: {
        order: 1001,
        bill: 2001
      }
    };

    this.loadDatabase();
  }

  loadDatabase() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed.menuItems && parsed.tables) {
          this.data = parsed;
          console.log(`[Database] Loaded ${this.data.menuItems.length} menu items, ${this.data.tables.length} tables, ${this.data.orders.length} orders from store.json`);
          return;
        }
      }
    } catch (e) {
      console.warn("[Database] Failed to read store.json, using initial state:", e.message);
    }
    this.saveDatabase();
  }

  saveDatabase() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error("[Database] Error writing to store.json:", e);
    }
  }

  // ==================== RESTAURANT INFO ====================
  getRestaurantInfo() {
    return this.data.restaurant;
  }

  updateRestaurantInfo(info) {
    this.data.restaurant = { ...this.data.restaurant, ...info };
    this.saveDatabase();
    return this.data.restaurant;
  }

  // ==================== CATEGORIES ====================
  getCategories() {
    return this.data.categories.sort((a, b) => a.order - b.order);
  }

  // ==================== MENU ITEMS CRUD ====================
  getMenuItems(includeUnavailable = true, category = null) {
    let items = this.data.menuItems;
    if (!includeUnavailable) {
      items = items.filter(i => i.isAvailable);
    }
    if (category && category !== 'all') {
      items = items.filter(i => i.categorySlug === category);
    }
    return items;
  }

  getMenuItemById(id) {
    return this.data.menuItems.find(i => i.id === id) || null;
  }

  addMenuItem(itemData) {
    const id = `item-${Date.now()}`;
    const category = this.data.categories.find(c => c.slug === itemData.categorySlug);
    const newItem = {
      id,
      name: itemData.name.trim(),
      categorySlug: itemData.categorySlug,
      categoryName: category ? category.name : "Specials",
      price: parseFloat(itemData.price),
      isVeg: itemData.isVeg === true || itemData.isVeg === 'true',
      isSpicy: itemData.isSpicy === true || itemData.isSpicy === 'true',
      isBestseller: itemData.isBestseller === true || itemData.isBestseller === 'true',
      isAvailable: true,
      prepTime: parseInt(itemData.prepTime, 10) || 15,
      rating: 4.8,
      description: itemData.description || "",
      image: itemData.image || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
      createdAt: Date.now()
    };

    this.data.menuItems.unshift(newItem);
    this.saveDatabase();
    return newItem;
  }

  updateMenuItem(id, updates) {
    const index = this.data.menuItems.findIndex(i => i.id === id);
    if (index === -1) return null;

    if (updates.categorySlug && updates.categorySlug !== this.data.menuItems[index].categorySlug) {
      const category = this.data.categories.find(c => c.slug === updates.categorySlug);
      if (category) updates.categoryName = category.name;
    }

    if (updates.price !== undefined) updates.price = parseFloat(updates.price);
    if (updates.prepTime !== undefined) updates.prepTime = parseInt(updates.prepTime, 10);
    if (updates.isVeg !== undefined) updates.isVeg = updates.isVeg === true || updates.isVeg === 'true';
    if (updates.isAvailable !== undefined) updates.isAvailable = updates.isAvailable === true || updates.isAvailable === 'true';

    this.data.menuItems[index] = {
      ...this.data.menuItems[index],
      ...updates,
      updatedAt: Date.now()
    };

    this.saveDatabase();
    return this.data.menuItems[index];
  }

  toggleItemAvailability(id) {
    const item = this.getMenuItemById(id);
    if (!item) return null;
    item.isAvailable = !item.isAvailable;
    item.updatedAt = Date.now();
    this.saveDatabase();
    return item;
  }

  deleteMenuItem(id) {
    const initialLen = this.data.menuItems.length;
    this.data.menuItems = this.data.menuItems.filter(i => i.id !== id);
    const success = this.data.menuItems.length < initialLen;
    if (success) this.saveDatabase();
    return success;
  }

  // ==================== TABLES MANAGEMENT ====================
  getTables() {
    return this.data.tables.map(t => {
      const activeOrders = this.data.orders.filter(
        o => o.tableCode === t.code && !['served', 'completed', 'cancelled', 'rejected'].includes(o.status)
      );
      return {
        ...t,
        status: activeOrders.length > 0 ? "occupied" : "available",
        activeOrdersCount: activeOrders.length,
        activeOrders
      };
    });
  }

  getTableByCode(code) {
    const formatted = code.toUpperCase().trim();
    return this.data.tables.find(t => t.code === formatted) || null;
  }

  addTable({ code, name, capacity = 4 }) {
    const formattedCode = code.toUpperCase().trim();
    if (this.data.tables.some(t => t.code === formattedCode)) {
      throw new Error(`Table code ${formattedCode} already exists.`);
    }

    const newTable = {
      id: `tbl-${Date.now()}`,
      code: formattedCode,
      name: name || `Table ${formattedCode}`,
      capacity: parseInt(capacity, 10) || 4,
      status: "available",
      activeOrderId: null
    };

    this.data.tables.push(newTable);
    this.saveDatabase();
    return newTable;
  }

  deleteTable(code) {
    const formatted = code.toUpperCase().trim();
    this.data.tables = this.data.tables.filter(t => t.code !== formatted);
    this.saveDatabase();
    return true;
  }

  async generateTableQR(code, baseUrl) {
    const formatted = code.toUpperCase().trim();
    const targetUrl = `${baseUrl}/menu?table=${formatted}`;
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 400,
      color: {
        dark: '#1c1917',
        light: '#ffffff'
      }
    });

    return {
      tableCode: formatted,
      targetUrl,
      qrDataUrl
    };
  }

  // ==================== STAFF MANAGEMENT ====================
  getStaff() {
    return this.data.staff;
  }

  addStaff({ name, email, role = "counter", phone = "" }) {
    const newStaff = {
      id: `stf-${Date.now()}`,
      name,
      email,
      role, // 'admin', 'counter', 'chef'
      status: "active",
      phone,
      createdAt: Date.now()
    };
    this.data.staff.push(newStaff);
    this.saveDatabase();
    return newStaff;
  }

  updateStaff(id, updates) {
    const staff = this.data.staff.find(s => s.id === id);
    if (!staff) return null;
    Object.assign(staff, updates);
    this.saveDatabase();
    return staff;
  }

  // ==================== 7-STEP ORDER LIFECYCLE ====================
  /**
   * Status progression:
   * 1. 'placed' -> Customer placed order (30s cancellation window active)
   * 2. 'confirmed' -> Counter staff accepted order
   * 3. 'in_kitchen' -> Counter forwarded order to kitchen
   * 4. 'preparing' -> Chef started cooking
   * 5. 'food_ready' -> Chef marked food ready on pass
   * 6. 'out_for_delivery' -> Waitstaff dispatched with food to table
   * 7. 'served' -> Delivered to table
   * Other terminal states: 'rejected', 'cancelled', 'completed'
   */

  createOrder({ tableCode = "T01", orderType = "dine_in", items, customerNotes = "", customerName = "Guest", customerPhone = "" }, io) {
    const now = Date.now();
    const orderNumber = `ORD-${this.data.counters.order++}`;
    const formattedTable = (tableCode || "T01").toUpperCase().trim();

    // Calculate totals
    const orderItems = items.map(item => {
      const price = parseFloat(item.price);
      const qty = parseInt(item.quantity, 10) || 1;
      return {
        id: `oi-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        menuItemId: item.id,
        name: item.name,
        price,
        quantity: qty,
        subtotal: price * qty,
        isPrepared: false,
        image: item.image || ""
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = Math.round(subtotal * 0.05); // 5% GST
    const grandTotal = subtotal + taxAmount;

    // Estimate prep time based on highest item prep time
    const maxItemPrepTime = Math.max(...items.map(i => i.prepTime || 15), 15);

    const newOrder = {
      id: orderNumber,
      orderNumber,
      tableCode: formattedTable,
      orderType, // 'dine_in' or 'takeaway'
      customerName,
      customerPhone,
      customerNotes: customerNotes.trim(),
      items: orderItems,
      subtotal,
      taxAmount,
      discountAmount: 0,
      grandTotal,
      estimatedPrepTime: maxItemPrepTime,
      status: 'placed', // Step 1: Placed
      rejectionReason: null,
      createdAt: now,
      cancelExpiresAt: now + 30 * 1000, // 30-Second Grace Period
      confirmedAt: null,
      kitchenSentAt: null,
      cookingStartedAt: null,
      readyAt: null,
      deliveredAt: null,
      servedAt: null,
      completedAt: null,
      history: [
        { status: 'placed', timestamp: now, label: 'Order Placed by Customer', note: 'Awaiting counter confirmation' }
      ]
    };

    this.data.orders.unshift(newOrder);

    // Update table status
    const table = this.data.tables.find(t => t.code === formattedTable);
    if (table) {
      table.status = "occupied";
      table.activeOrderId = orderNumber;
    }

    this.saveDatabase();

    // Broadcast in real-time
    if (io) {
      io.emit('order:new', newOrder);
      io.to(`table-${formattedTable}`).emit('order:status_update', newOrder);
    }

    return newOrder;
  }

  // Cancel order (Strict 30 seconds limit)
  cancelOrder(orderId, reason = "Customer cancelled order", io) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: "Order not found." };

    const now = Date.now();
    const elapsedMs = now - order.createdAt;

    if (order.status !== 'placed' || elapsedMs > 30 * 1000) {
      return {
        success: false,
        error: "Cancellation window of 30 seconds has expired. Food is already forwarded for preparation."
      };
    }

    order.status = 'cancelled';
    order.rejectionReason = reason;
    order.history.push({ status: 'cancelled', timestamp: now, label: 'Order Cancelled', note: reason });

    this.saveDatabase();

    if (io) {
      io.emit('order:cancelled', order);
      io.to(`table-${order.tableCode}`).emit('order:status_update', order);
    }

    return { success: true, message: "Order cancelled successfully.", order };
  }

  // Update order status through the 7 steps
  updateOrderStatus(orderId, nextStatus, { reason = "", estimatedPrepTime = null, io } = {}) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: "Order not found." };

    const now = Date.now();
    order.status = nextStatus;

    if (estimatedPrepTime) {
      order.estimatedPrepTime = parseInt(estimatedPrepTime, 10);
    }

    const labels = {
      'confirmed': 'Order Confirmed by Counter',
      'in_kitchen': 'Order Sent to Kitchen',
      'preparing': 'Chef Preparing Your Food',
      'food_ready': 'Food Ready at Cooking Station',
      'out_for_delivery': 'Out for Delivery to Table',
      'served': 'Food Served at Table',
      'completed': 'Order Completed & Billed',
      'rejected': `Order Rejected: ${reason}`
    };

    if (nextStatus === 'confirmed') order.confirmedAt = now;
    if (nextStatus === 'in_kitchen') order.kitchenSentAt = now;
    if (nextStatus === 'preparing') order.cookingStartedAt = now;
    if (nextStatus === 'food_ready') order.readyAt = now;
    if (nextStatus === 'out_for_delivery') order.deliveredAt = now;
    if (nextStatus === 'served') order.servedAt = now;
    if (nextStatus === 'completed') order.completedAt = now;
    if (nextStatus === 'rejected') order.rejectionReason = reason;

    order.history.push({
      status: nextStatus,
      timestamp: now,
      label: labels[nextStatus] || nextStatus,
      note: reason || ""
    });

    this.saveDatabase();

    if (io) {
      io.emit('order:status_update', order);
      io.to(`table-${order.tableCode}`).emit('order:status_update', order);

      // Notification triggers
      if (nextStatus === 'in_kitchen') io.emit('kitchen:new_ticket', order);
      if (nextStatus === 'food_ready') io.emit('counter:food_ready', order);
    }

    return { success: true, order };
  }

  // Chef individual dish check-off
  markOrderItemPrepared(orderId, itemId, isPrepared, io) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return null;

    const item = order.items.find(i => i.id === itemId);
    if (!item) return null;

    item.isPrepared = isPrepared;
    
    // If all items are prepared, auto-ready candidate
    const allPrepared = order.items.every(i => i.isPrepared);

    this.saveDatabase();

    if (io) {
      io.emit('order:item_updated', { orderId, itemId, isPrepared, allPrepared });
    }

    return { order, item, allPrepared };
  }

  getOrders(filter = 'all') {
    let list = this.data.orders;
    if (filter === 'active') {
      list = list.filter(o => !['served', 'completed', 'cancelled', 'rejected'].includes(o.status));
    } else if (filter === 'counter_pending') {
      list = list.filter(o => o.status === 'placed');
    } else if (filter === 'kitchen') {
      list = list.filter(o => ['in_kitchen', 'preparing'].includes(o.status));
    } else if (filter === 'ready') {
      list = list.filter(o => o.status === 'food_ready');
    }
    return list;
  }

  getOrderById(id) {
    return this.data.orders.find(o => o.id === id) || null;
  }

  // ==================== BILLING & PAYMENTS ====================
  generateBill(orderId, { paymentMethod = "cash", discount = 0, transactionId = "", io } = {}) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: "Order not found." };

    const billNumber = `BILL-2026-${this.data.counters.bill++}`;
    const now = Date.now();
    const discountAmount = parseFloat(discount) || 0;
    const finalTotal = Math.max(0, order.grandTotal - discountAmount);

    const payment = {
      id: `pay-${Date.now()}`,
      billNumber,
      orderId: order.id,
      tableCode: order.tableCode,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      discountAmount,
      totalAmount: finalTotal,
      paymentMethod, // 'cash', 'upi', 'card'
      paymentStatus: 'paid',
      transactionId: transactionId || `TXN-${Math.floor(100000 + Math.random()*900000)}`,
      paidAt: now,
      createdAt: now,
      restaurant: this.data.restaurant,
      items: order.items
    };

    this.data.payments.unshift(payment);

    // Update order status to completed
    order.status = 'completed';
    order.completedAt = now;
    order.payment = payment;

    // Free the table
    const table = this.data.tables.find(t => t.code === order.tableCode);
    if (table) {
      const otherActive = this.data.orders.some(o => o.tableCode === table.code && o.id !== order.id && !['served', 'completed', 'cancelled', 'rejected'].includes(o.status));
      if (!otherActive) {
        table.status = 'available';
        table.activeOrderId = null;
      }
    }

    this.saveDatabase();

    if (io) {
      io.emit('bill:generated', payment);
      io.emit('order:status_update', order);
      io.to(`table-${order.tableCode}`).emit('order:status_update', order);
    }

    return { success: true, payment };
  }

  getPayments() {
    return this.data.payments;
  }

  // ==================== ANALYTICS & DASHBOARD METRICS ====================
  getDashboardAnalytics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayOrders = this.data.orders.filter(o => o.createdAt >= startOfToday);
    const todayRevenue = this.data.payments
      .filter(p => p.paidAt >= startOfToday)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const pendingOrders = this.data.orders.filter(o => o.status === 'placed').length;
    const preparingOrders = this.data.orders.filter(o => ['in_kitchen', 'preparing'].includes(o.status)).length;
    const completedOrders = this.data.orders.filter(o => ['served', 'completed'].includes(o.status)).length;
    const cancelledOrders = this.data.orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length;

    const activeTables = this.data.tables.filter(t => t.status === 'occupied').length;

    // Top most ordered dishes
    const dishCounts = {};
    this.data.orders.forEach(o => {
      if (o.status !== 'cancelled' && o.status !== 'rejected') {
        o.items.forEach(item => {
          dishCounts[item.name] = (dishCounts[item.name] || 0) + item.quantity;
        });
      }
    });

    const mostOrderedDishes = Object.entries(dishCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Category distribution
    const categoryCounts = {};
    this.data.orders.forEach(o => {
      o.items.forEach(item => {
        const dish = this.data.menuItems.find(m => m.name === item.name);
        const cat = dish ? dish.categoryName : "Other";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + item.quantity;
      });
    });

    return {
      todayTotalOrders: todayOrders.length,
      todayRevenue,
      pendingOrders,
      preparingOrders,
      completedOrders,
      cancelledOrders,
      totalMenuItems: this.data.menuItems.length,
      activeTables,
      totalTables: this.data.tables.length,
      mostOrderedDishes,
      categoryDistribution: categoryCounts
    };
  }
}

module.exports = new SmartDineDatabase();
