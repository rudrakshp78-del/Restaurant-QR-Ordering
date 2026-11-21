const QRCode = require('qrcode');

// Initial Table Configuration (Tables 1 to 12)
let tables = [];
for (let i = 1; i <= 12; i++) {
  tables.push({
    id: i,
    tableNumber: i,
    name: `Table ${i}`,
    status: "available", // 'available', 'occupied', 'billed'
    activeOrderIds: []
  });
}

// In-memory Orders Storage
let orders = [];
let orderCounter = 1001;

// Active setTimeout handles for 30s auto-confirm timers
const cancelTimers = new Map();

/**
 * Get all tables with current occupancy
 */
function getTables() {
  return tables.map(t => {
    const activeOrders = orders.filter(o => o.tableNumber === t.tableNumber && !['served', 'cancelled'].includes(o.status));
    return {
      ...t,
      status: activeOrders.length > 0 ? "occupied" : "available",
      activeOrdersCount: activeOrders.length
    };
  });
}

/**
 * Get table by number
 */
function getTableByNumber(tableNumber) {
  const num = parseInt(tableNumber, 10);
  return tables.find(t => t.tableNumber === num) || null;
}

/**
 * Get all orders
 */
function getOrders() {
  return orders.map(enrichOrder);
}

/**
 * Get specific order by ID
 */
function getOrderById(orderId) {
  const order = orders.find(o => o.id === orderId);
  return order ? enrichOrder(order) : null;
}

/**
 * Enrich order with live countdown and cancellation eligibility
 */
function enrichOrder(order) {
  const now = Date.now();
  const elapsedMs = now - order.createdAt;
  const remainingMs = Math.max(0, order.expiresCancelAt - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const canCancel = order.status === 'pending_confirmation' && remainingMs > 0;

  return {
    ...order,
    canCancel,
    cancelRemainingSeconds: remainingSeconds,
    elapsedSeconds: Math.floor(elapsedMs / 1000)
  };
}

/**
 * Create a new order with 30-Second Cancellation Grace Period
 */
function createOrder({ tableNumber, items, customerNotes = "", customerName = "Guest" }, io) {
  const now = Date.now();
  const orderId = `ORD-${orderCounter++}`;
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const newOrder = {
    id: orderId,
    tableNumber: parseInt(tableNumber, 10),
    customerName,
    items,
    totalAmount,
    customerNotes,
    status: 'pending_confirmation', // Initial state with 30s countdown
    createdAt: now,
    expiresCancelAt: now + 30 * 1000, // Strictly 30 seconds
    confirmedAt: null,
    cookingStartedAt: null,
    readyAt: null,
    servedAt: null,
    cancelledAt: null,
    cancellationReason: null
  };

  orders.unshift(newOrder);

  // Update table status
  const table = tables.find(t => t.tableNumber === newOrder.tableNumber);
  if (table) {
    table.status = 'occupied';
    if (!table.activeOrderIds.includes(orderId)) {
      table.activeOrderIds.push(orderId);
    }
  }

  const enriched = enrichOrder(newOrder);

  // Broadcast to kitchen and customer
  if (io) {
    io.emit('order:created', enriched);
    io.to(`table-${tableNumber}`).emit('order:my_order', enriched);
  }

  // Set the strict 30-Second Timer
  const timer = setTimeout(() => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (currentOrder && currentOrder.status === 'pending_confirmation') {
      currentOrder.status = 'confirmed';
      currentOrder.confirmedAt = Date.now();

      const updatedEnriched = enrichOrder(currentOrder);
      console.log(`[Order ${orderId}] 30s grace period expired. Order locked and confirmed for kitchen.`);

      if (io) {
        // Notify both kitchen and table that order is locked into cooking queue
        io.emit('order:locked', updatedEnriched);
        io.emit('order:updated', updatedEnriched);
        io.to(`table-${tableNumber}`).emit('order:status_changed', updatedEnriched);
      }
    }
    cancelTimers.delete(orderId);
  }, 30 * 1000);

  cancelTimers.set(orderId, timer);

  return enriched;
}

/**
 * Cancel an order - ONLY ALLOWED WITHIN 30 SECONDS
 */
function cancelOrder(orderId, reason = "Cancelled by customer within 30-second window", io) {
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return { success: false, error: "Order not found." };
  }

  const now = Date.now();
  const elapsedMs = now - order.createdAt;

  // Strict enforcement: cannot cancel if > 30 seconds or if already cooking/served/cancelled
  if (order.status !== 'pending_confirmation' || elapsedMs > 30 * 1000) {
    return {
      success: false,
      error: `Cancellation window has expired! Orders can only be cancelled within 30 seconds. Order is now being prepared in the kitchen.`,
      order: enrichOrder(order)
    };
  }

  // Cancel order
  order.status = 'cancelled';
  order.cancelledAt = now;
  order.cancellationReason = reason;

  // Clear server timeout
  if (cancelTimers.has(orderId)) {
    clearTimeout(cancelTimers.get(orderId));
    cancelTimers.delete(orderId);
  }

  // Check table status
  const table = tables.find(t => t.tableNumber === order.tableNumber);
  if (table) {
    table.activeOrderIds = table.activeOrderIds.filter(id => id !== orderId);
    const hasOtherActive = orders.some(o => o.tableNumber === order.tableNumber && !['served', 'cancelled'].includes(o.status));
    if (!hasOtherActive) {
      table.status = 'available';
    }
  }

  const enriched = enrichOrder(order);

  if (io) {
    io.emit('order:cancelled', enriched);
    io.emit('order:updated', enriched);
    io.to(`table-${order.tableNumber}`).emit('order:status_changed', enriched);
  }

  return {
    success: true,
    message: "Order has been cancelled successfully within the 30-second window.",
    order: enriched
  };
}

/**
 * Kitchen update order status: 'cooking', 'ready', 'served'
 */
function updateOrderStatus(orderId, newStatus, io) {
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return { success: false, error: "Order not found." };
  }

  const allowedTransitions = ['confirmed', 'cooking', 'ready', 'served', 'cancelled'];
  if (!allowedTransitions.includes(newStatus)) {
    return { success: false, error: `Invalid status: ${newStatus}` };
  }

  order.status = newStatus;
  const now = Date.now();

  if (newStatus === 'cooking') order.cookingStartedAt = now;
  if (newStatus === 'ready') order.readyAt = now;
  if (newStatus === 'served') {
    order.servedAt = now;
    // Check if table can be cleared
    const table = tables.find(t => t.tableNumber === order.tableNumber);
    if (table) {
      table.activeOrderIds = table.activeOrderIds.filter(id => id !== orderId);
    }
  }

  const enriched = enrichOrder(order);

  if (io) {
    io.emit('order:updated', enriched);
    io.to(`table-${order.tableNumber}`).emit('order:status_changed', enriched);
  }

  return { success: true, order: enriched };
}

/**
 * Generate QR Code data URL for a specific table
 */
async function generateTableQR(tableNumber, baseUrl) {
  const targetUrl = `${baseUrl}/?table=${tableNumber}`;
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    width: 350,
    color: {
      dark: '#1e293b',
      light: '#ffffff'
    }
  });

  return {
    tableNumber,
    targetUrl,
    qrDataUrl
  };
}

module.exports = {
  getTables,
  getTableByNumber,
  getOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  updateOrderStatus,
  generateTableQR,
  tables,
  orders
};
