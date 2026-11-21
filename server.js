const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');

const { menuItems } = require('./data/menu');
const store = require('./data/store');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

const PORT = process.env.PORT || 3000;

// Helper: Get Primary Local Wi-Fi / LAN IP Address
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (127.0.0.1) and non-ipv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalNetworkIp();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== REST API ROUTES ====================

// Network & Host info (useful for QR code generation targeting mobile phones)
app.get('/api/network-info', (req, res) => {
  const host = req.headers.host || `${localIp}:${PORT}`;
  const protocol = req.protocol || 'http';
  res.json({
    localIp,
    port: PORT,
    detectedHost: host,
    baseUrl: `${protocol}://${host}`,
    wifiUrl: `http://${localIp}:${PORT}`
  });
});

// Get Menu Items
app.get('/api/menu', (req, res) => {
  const category = req.query.category;
  if (category && category !== 'all') {
    return res.json(menuItems.filter(item => item.category === category));
  }
  res.json(menuItems);
});

// Get All Tables
app.get('/api/tables', (req, res) => {
  res.json(store.getTables());
});

// Get Table Details
app.get('/api/tables/:tableNumber', (req, res) => {
  const table = store.getTableByNumber(req.params.tableNumber);
  if (!table) {
    return res.status(404).json({ error: "Table not found." });
  }
  res.json(table);
});

// Generate Table QR Code
app.get('/api/tables/:tableNumber/qr', async (req, res) => {
  try {
    const tableNumber = req.params.tableNumber;
    // Base URL can be passed via query param or default to requesting host/local WiFi IP
    const baseUrl = req.query.baseUrl || `http://${localIp}:${PORT}`;
    const qrData = await store.generateTableQR(tableNumber, baseUrl);
    res.json(qrData);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate QR code." });
  }
});

// Get Batch QR codes for all tables (for print sheets)
app.get('/api/tables-qr-all', async (req, res) => {
  try {
    const baseUrl = req.query.baseUrl || `http://${localIp}:${PORT}`;
    const tables = store.getTables();
    const qrList = await Promise.all(
      tables.map(t => store.generateTableQR(t.tableNumber, baseUrl))
    );
    res.json(qrList);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate all QR codes." });
  }
});

// Get All Orders
app.get('/api/orders', (req, res) => {
  res.json(store.getOrders());
});

// Get Orders for a specific table
app.get('/api/orders/table/:tableNumber', (req, res) => {
  const tableNum = parseInt(req.params.tableNumber, 10);
  const tableOrders = store.getOrders().filter(o => o.tableNumber === tableNum);
  res.json(tableOrders);
});

// Get Single Order with live cancellation window
app.get('/api/orders/:id', (req, res) => {
  const order = store.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }
  res.json(order);
});

// Place Order (Starts 30-Second Countdown Window)
app.post('/api/orders', (req, res) => {
  const { tableNumber, items, customerNotes, customerName } = req.body;

  if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Please provide a valid table number and at least one item." });
  }

  const order = store.createOrder({
    tableNumber,
    items,
    customerNotes,
    customerName
  }, io);

  res.status(201).json({
    success: true,
    message: "Order placed successfully! You have 30 seconds to cancel.",
    order
  });
});

// Cancel Order (STRICT 30-SECOND WINDOW ENFORCEMENT)
app.post('/api/orders/:id/cancel', (req, res) => {
  const orderId = req.params.id;
  const reason = req.body.reason || "Customer cancelled order";

  const result = store.cancelOrder(orderId, reason, io);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Kitchen / Staff Update Order Status (cooking, ready, served)
app.patch('/api/orders/:id/status', (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const result = store.updateOrderStatus(orderId, status, io);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Reset Table Orders (Admin/Cashier after payment)
app.post('/api/tables/:tableNumber/settle', (req, res) => {
  const tableNum = parseInt(req.params.tableNumber, 10);
  const table = store.getTableByNumber(tableNum);
  if (!table) return res.status(404).json({ error: "Table not found." });

  // Mark all active orders as served
  store.orders.forEach(o => {
    if (o.tableNumber === tableNum && !['served', 'cancelled'].includes(o.status)) {
      o.status = 'served';
      o.servedAt = Date.now();
    }
  });

  table.status = 'available';
  table.activeOrderIds = [];

  io.emit('table:updated', { tableNumber: tableNum, status: 'available' });
  io.emit('order:refresh');
  res.json({ success: true, message: `Table ${tableNum} settled successfully.` });
});

// ==================== REAL-TIME WEBSOCKET (SOCKET.IO) ====================
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Join table room
  socket.on('table:join', (tableNumber) => {
    const room = `table-${tableNumber}`;
    socket.join(room);
    console.log(`[Socket] Joined table room: ${room}`);
  });

  // Join kitchen display room
  socket.on('kitchen:join', () => {
    socket.join('kitchen');
    console.log(`[Socket] Joined kitchen display`);
  });

  // Client requests cancellation via socket
  socket.on('order:cancel_request', ({ orderId, reason }) => {
    const result = store.cancelOrder(orderId, reason, io);
    socket.emit('order:cancel_response', result);
  });

  // Kitchen changes status
  socket.on('order:update_status', ({ orderId, status }) => {
    const result = store.updateOrderStatus(orderId, status, io);
    socket.emit('order:update_response', result);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Fallback HTML routing for clean URLs
app.get('/kitchen', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kitchen.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/qrcodes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr-print.html'));
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🍽️  GAJANAN HOTEL - DIRECT QR ORDERING & KITCHEN SYSTEM`);
  console.log(`======================================================`);
  console.log(`🚀 Local Server:      http://localhost:${PORT}`);
  console.log(`📱 Wi-Fi Network URL: http://${localIp}:${PORT} (For Phone/Google Lens)`);
  console.log(`👨‍🍳 Kitchen Display:   http://localhost:${PORT}/kitchen`);
  console.log(`🖨️  Print Table QRs:   http://localhost:${PORT}/qrcodes`);
  console.log(`⚙️  Admin / Billing:   http://localhost:${PORT}/admin`);
  console.log(`======================================================\n`);
});
