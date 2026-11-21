// Restaurant Manager & Billing Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
  const refreshIcons = () => {
    if (window.lucide) window.lucide.createIcons();
  };

  let tables = [];
  let orders = [];

  const adminTablesGrid = document.getElementById('adminTablesGrid');
  const ordersTableBody = document.getElementById('ordersTableBody');
  const statOccupiedTables = document.getElementById('statOccupiedTables');
  const statAvailableTables = document.getElementById('statAvailableTables');
  const statActiveOrders = document.getElementById('statActiveOrders');
  const statTotalRevenue = document.getElementById('statTotalRevenue');
  const refreshBtn = document.getElementById('refreshBtn');

  // Socket.io for live updates
  const socket = io();

  socket.on('connect', () => {
    console.log('[Admin] Connected to server');
  });

  socket.on('order:created', () => loadData());
  socket.on('order:cancelled', () => loadData());
  socket.on('order:locked', () => loadData());
  socket.on('order:updated', () => loadData());
  socket.on('table:updated', () => loadData());

  refreshBtn.addEventListener('click', () => loadData());

  async function loadData() {
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/orders')
      ]);

      tables = await tablesRes.json();
      orders = await ordersRes.json();

      updateStats();
      renderTables();
      renderOrdersLog();
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }

  function updateStats() {
    const occupiedCount = tables.filter(t => t.status === 'occupied').length;
    const availableCount = tables.length - occupiedCount;
    const activeOrdersCount = orders.filter(o => !['served', 'cancelled'].includes(o.status)).length;
    
    // Total revenue from non-cancelled orders
    const totalRev = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount + Math.round(o.totalAmount * 0.05)), 0);

    statOccupiedTables.textContent = occupiedCount;
    statAvailableTables.textContent = `${availableCount} Available`;
    statActiveOrders.textContent = activeOrdersCount;
    statTotalRevenue.textContent = `₹${totalRev.toLocaleString()}`;
  }

  function renderTables() {
    adminTablesGrid.innerHTML = tables.map(t => {
      const isOccupied = t.status === 'occupied';
      const tableOrders = orders.filter(o => o.tableNumber === t.tableNumber && !['served', 'cancelled'].includes(o.status));
      const tableTotal = tableOrders.reduce((sum, o) => sum + (o.totalAmount + Math.round(o.totalAmount * 0.05)), 0);

      return `
        <div class="bg-white rounded-2xl p-4 border ${isOccupied ? 'border-orange-300 ring-2 ring-orange-500/10' : 'border-slate-200'} shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <span class="text-base font-extrabold text-slate-900 font-mono">TABLE ${t.tableNumber < 10 ? '0' + t.tableNumber : t.tableNumber}</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isOccupied ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}">
                ${isOccupied ? '● Occupied' : '○ Vacant'}
              </span>
            </div>

            <div class="py-3">
              ${isOccupied ? `
                <div class="text-xs text-slate-500">Active Bill:</div>
                <div class="text-xl font-black text-slate-900 mt-0.5">₹${tableTotal}</div>
                <div class="text-[11px] text-orange-600 font-semibold mt-1">
                  ${tableOrders.length} order(s) placed
                </div>
              ` : `
                <div class="text-xs text-slate-400 py-2">
                  Table is ready for incoming guests
                </div>
              `}
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <a href="/?table=${t.tableNumber}" target="_blank" class="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-center text-[11px] transition">
              Open Menu
            </a>
            ${isOccupied ? `
              <button onclick="window.settleTable(${t.tableNumber})" class="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition">
                Settle & Clear
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    refreshIcons();
  }

  function renderOrdersLog() {
    if (orders.length === 0) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="p-6 text-center text-slate-400">No orders placed yet.</td>
        </tr>
      `;
      return;
    }

    ordersTableBody.innerHTML = orders.slice(0, 15).map(o => {
      let statusColor = 'bg-slate-100 text-slate-700';
      let label = o.status.toUpperCase();

      if (o.status === 'pending_confirmation') {
        statusColor = 'bg-amber-100 text-amber-800 animate-pulse';
        label = `30s Cancel Grace (${o.cancelRemainingSeconds}s)`;
      } else if (o.status === 'confirmed') {
        statusColor = 'bg-sky-100 text-sky-800';
        label = 'CONFIRMED / QUEUED';
      } else if (o.status === 'cooking') {
        statusColor = 'bg-orange-100 text-orange-800';
        label = 'COOKING';
      } else if (o.status === 'ready') {
        statusColor = 'bg-emerald-100 text-emerald-800';
        label = 'READY';
      } else if (o.status === 'served') {
        statusColor = 'bg-slate-200 text-slate-700';
        label = 'SERVED';
      } else if (o.status === 'cancelled') {
        statusColor = 'bg-red-100 text-red-800';
        label = 'CANCELLED';
      }

      const totalWithTax = o.totalAmount + Math.round(o.totalAmount * 0.05);

      return `
        <tr class="hover:bg-slate-50/80 transition">
          <td class="p-3 pl-6 font-mono font-bold text-slate-800">#${o.id}</td>
          <td class="p-3 font-semibold text-slate-700">Table ${o.tableNumber}</td>
          <td class="p-3 text-slate-600 truncate max-w-xs">
            ${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
          </td>
          <td class="p-3 font-bold text-slate-900">₹${totalWithTax}</td>
          <td class="p-3 text-slate-500 text-[11px]">${new Date(o.createdAt).toLocaleTimeString()}</td>
          <td class="p-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}">
              ${label}
            </span>
          </td>
          <td class="p-3 pr-6 text-right">
            ${o.status === 'pending_confirmation' ? `
              <span class="text-[10px] text-amber-600 font-semibold">Active Grace Period</span>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    refreshIcons();
  }

  window.settleTable = async (tableNumber) => {
    if (!confirm(`Settle bill and clear Table ${tableNumber}?`)) return;
    try {
      const res = await fetch(`/api/tables/${tableNumber}/settle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  loadData();
});
