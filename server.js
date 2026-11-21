const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const multer = require('multer');

const db = require('./data/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

const PORT = process.env.PORT || 3000;

// Helper: Primary Local Wi-Fi / LAN IP Address for Google Lens QR scanning
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalNetworkIp();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `dish-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname))); // Root fallback

// ==================== REST APIS ====================

// Network & Host info
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

// Image Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided." });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl });
});

// Restaurant Info
app.get('/api/restaurant', (req, res) => {
  res.json(db.getRestaurantInfo());
});

app.put('/api/restaurant', (req, res) => {
  res.json(db.updateRestaurantInfo(req.body));
});

// Categories
app.get('/api/categories', (req, res) => {
  res.json(db.getCategories());
});

// Menu Items
app.get('/api/menu', (req, res) => {
  const includeUnavailable = req.query.all === 'true' || req.query.includeUnavailable === 'true';
  const category = req.query.category;
  res.json(db.getMenuItems(includeUnavailable, category));
});

app.get('/api/menu/:id', (req, res) => {
  const item = db.getMenuItemById(req.params.id);
  if (!item) return res.status(404).json({ error: "Dish not found." });
  res.json(item);
});

// Admin: Add Dish
app.post('/api/menu', (req, res) => {
  try {
    const newItem = db.addMenuItem(req.body);
    io.emit('menu:updated');
    res.status(201).json({ success: true, item: newItem });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: Edit Dish
app.put('/api/menu/:id', (req, res) => {
  const updated = db.updateMenuItem(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Dish not found." });
  io.emit('menu:updated');
  res.json({ success: true, item: updated });
});

// Admin: Toggle Availability
app.patch('/api/menu/:id/toggle', (req, res) => {
  const updated = db.toggleItemAvailability(req.params.id);
  if (!updated) return res.status(404).json({ error: "Dish not found." });
  io.emit('menu:updated');
  res.json({ success: true, item: updated });
});

// Admin: Delete Dish
app.delete('/api/menu/:id', (req, res) => {
  const success = db.deleteMenuItem(req.params.id);
  if (!success) return res.status(404).json({ error: "Dish not found." });
  io.emit('menu:updated');
  res.json({ success: true });
});

// Tables Management
app.get('/api/tables', (req, res) => {
  res.json(db.getTables());
});

app.get('/api/tables/:code', (req, res) => {
  const table = db.getTableByCode(req.params.code);
  if (!table) return res.status(404).json({ error: "Table not found." });
  res.json(table);
});

app.post('/api/tables', (req, res) => {
  try {
    const newTable = db.addTable(req.body);
    io.emit('tables:updated');
    res.status(201).json({ success: true, table: newTable });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/tables/:code', (req, res) => {
  db.deleteTable(req.params.code);
  io.emit('tables:updated');
  res.json({ success: true });
});

app.get('/api/tables/:code/qr', async (req, res) => {
  try {
    const baseUrl = req.query.baseUrl || `http://${localIp}:${PORT}`;
    const qrData = await db.generateTableQR(req.params.code, baseUrl);
    res.json(qrData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tables-qr-all', async (req, res) => {
  try {
    const baseUrl = req.query.baseUrl || `http://${localIp}:${PORT}`;
    const tables = db.getTables();
    const qrList = await Promise.all(
      tables.map(t => db.generateTableQR(t.code, baseUrl))
    );
    res.json(qrList);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== 7-STEP ORDER ROUTES ====================

app.get('/api/orders', (req, res) => {
  const filter = req.query.filter || 'all';
  res.json(db.getOrders(filter));
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json(order);
});

// Customer Places Order (Step 1)
app.post('/api/orders', (req, res) => {
  const { tableCode, orderType, items, customerNotes, customerName, customerPhone } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty. Please select food items." });
  }

  const order = db.createOrder({
    tableCode: tableCode || "T01",
    orderType: orderType || "dine_in",
    items,
    customerNotes,
    customerName,
    customerPhone
  }, io);

  res.status(201).json({
    success: true,
    message: "Order placed successfully! Awaiting counter confirmation.",
    order
  });
});

// Customer Cancels Order (30-second window only)
app.post('/api/orders/:id/cancel', (req, res) => {
  const result = db.cancelOrder(req.params.id, req.body.reason, io);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// Status Progression (Counter / Chef)
app.patch('/api/orders/:id/status', (req, res) => {
  const { status, reason, estimatedPrepTime } = req.body;
  const result = db.updateOrderStatus(req.params.id, status, { reason, estimatedPrepTime, io });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// Chef checks off individual dish
app.patch('/api/orders/:id/items/:itemId/prep', (req, res) => {
  const { isPrepared } = req.body;
  const result = db.markOrderItemPrepared(req.params.id, req.params.itemId, isPrepared, io);
  if (!result) return res.status(404).json({ error: "Order or item not found." });
  res.json({ success: true, ...result });
});

// Billing & Payment Generation
app.post('/api/orders/:id/bill', (req, res) => {
  const { paymentMethod, discount, transactionId } = req.body;
  const result = db.generateBill(req.params.id, { paymentMethod, discount, transactionId, io });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/payments', (req, res) => {
  res.json(db.getPayments());
});

// Analytics
app.get('/api/analytics', (req, res) => {
  res.json(db.getDashboardAnalytics());
});

// Staff
app.get('/api/staff', (req, res) => {
  res.json(db.getStaff());
});

app.post('/api/staff', (req, res) => {
  try {
    const staff = db.addStaff(req.body);
    res.status(201).json({ success: true, staff });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== REAL-TIME WEBSOCKETS ====================
io.on('connection', (socket) => {
  // Join room for specific table
  socket.on('table:join', (tableCode) => {
    const formatted = (tableCode || "T01").toUpperCase().trim();
    socket.join(`table-${formatted}`);
    console.log(`[Socket] Joined table room: table-${formatted}`);
  });

  socket.on('counter:join', () => {
    socket.join('counter');
  });

  socket.on('kitchen:join', () => {
    socket.join('kitchen');
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// ==================== PAGE ROUTES ====================
app.get(['/', '/menu'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

app.get('/counter', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'counter.html'));
});

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
  console.log(`👑 SMARTDINE - GAJANAN HOTEL RESTAURANT MANAGEMENT`);
  console.log(`======================================================`);
  console.log(`🌐 Customer Menu:       http://localhost:${PORT}/menu?table=T01`);
  console.log(`📱 Wi-Fi Mobile URL:    http://${localIp}:${PORT}/menu?table=T01`);
  console.log(`🛎️  Main Counter View:   http://localhost:${PORT}/counter`);
  console.log(`👨‍🍳 Chef Kitchen (KDS):  http://localhost:${PORT}/kitchen`);
  console.log(`📊 Owner Admin Panel:   http://localhost:${PORT}/admin`);
  console.log(`🖨️  Print Table QRs:     http://localhost:${PORT}/qrcodes`);
  console.log(`======================================================\n`);
});
