// SMARTDINE - Main Counter & Reception Operations
document.addEventListener('DOMContentLoaded', () => {
  const refreshIcons = () => {
    if (window.lucide) window.lucide.createIcons();
  };

  let orders = [];
  let currentFilter = 'all';
  let isMuted = false;
  let activeBillOrder = null;
  let selectedPaymentMethod = 'cash';

  // DOM Elements
  const counterOrdersGrid = document.getElementById('counterOrdersGrid');
  const counterEmptyState = document.getElementById('counterEmptyState');
  const statCounterPending = document.getElementById('statCounterPending');
  const statInKitchen = document.getElementById('statInKitchen');
  const counterClock = document.getElementById('counterClock');
  const toggleAudioBtn = document.getElementById('toggleAudioBtn');
  const audioIcon = document.getElementById('audioIcon');
  const audioText = document.getElementById('audioText');
  const filterButtons = document.querySelectorAll('.counter-filter-btn');
  const refreshCounterBtn = document.getElementById('refreshCounterBtn');

  // Bill Modal Elements
  const billModal = document.getElementById('billModal');
  const closeBillModalBtn = document.getElementById('closeBillModalBtn');
  const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
  const receiptBillNo = document.getElementById('receiptBillNo');
  const receiptOrderNo = document.getElementById('receiptOrderNo');
  const receiptTableCode = document.getElementById('receiptTableCode');
  const receiptDateTime = document.getElementById('receiptDateTime');
  const receiptItemsTbody = document.getElementById('receiptItemsTbody');
  const receiptSubtotal = document.getElementById('receiptSubtotal');
  const receiptTax = document.getElementById('receiptTax');
  const receiptDiscount = document.getElementById('receiptDiscount');
  const receiptGrandTotal = document.getElementById('receiptGrandTotal');
  const billDiscountInput = document.getElementById('billDiscountInput');
  const payMethodBtns = document.querySelectorAll('.pay-method-btn');

  // Clock
  setInterval(() => {
    counterClock.textContent = new Date().toLocaleTimeString();
  }, 1000);

  // Audio Toggle
  toggleAudioBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (window.restaurantAudio) window.restaurantAudio.muted = isMuted;
    audioText.textContent = isMuted ? "Sound OFF" : "Sound ON";
    audioIcon.className = isMuted ? "w-4 h-4 text-red-400" : "w-4 h-4 text-emerald-400";
    if (!isMuted && window.restaurantAudio) window.restaurantAudio.playOrderBell();
  });

  // Socket.IO
  const socket = io();
  socket.on('connect', () => {
    console.log('[Counter] Connected to server');
    socket.emit('counter:join');
  });

  socket.on('order:new', (order) => {
    orders.unshift(order);
    if (window.restaurantAudio) window.restaurantAudio.playOrderBell();
    renderCounter();
  });

  socket.on('order:status_update', (order) => {
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.unshift(order);
    }
    renderCounter();
  });

  socket.on('counter:food_ready', (order) => {
    if (window.restaurantAudio) window.restaurantAudio.playCookingAlert();
  });

  refreshCounterBtn.addEventListener('click', () => fetchOrders());

  async function fetchOrders() {
    try {
      const res = await fetch('/api/orders');
      orders = await res.json();
      renderCounter();
    } catch (e) {
      console.error(e);
    }
  }

  // Filter Buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active', 'bg-gold-500', 'text-charcoal-900');
        b.classList.add('bg-charcoal-800', 'text-stone-300');
      });
      btn.classList.add('active', 'bg-gold-500', 'text-charcoal-900');
      btn.classList.remove('bg-charcoal-800', 'text-stone-300');

      currentFilter = btn.dataset.filter;
      renderCounter();
    });
  });

  // Render Counter Orders
  function renderCounter() {
    // Update Counts
    const placedCount = orders.filter(o => o.status === 'placed').length;
    const kitchenCount = orders.filter(o => ['in_kitchen', 'preparing'].includes(o.status)).length;
    const readyCount = orders.filter(o => o.status === 'food_ready').length;
    const servedCount = orders.filter(o => o.status === 'served').length;

    statCounterPending.textContent = placedCount;
    statInKitchen.textContent = kitchenCount;

    document.getElementById('countAll').textContent = orders.filter(o => o.status !== 'completed').length;
    document.getElementById('countPlaced').textContent = placedCount;
    document.getElementById('countKitchen').textContent = kitchenCount;
    document.getElementById('countReady').textContent = readyCount;
    document.getElementById('countServed').textContent = servedCount;

    let list = orders;
    if (currentFilter === 'all') {
      list = orders.filter(o => o.status !== 'completed');
    } else if (currentFilter === 'placed') {
      list = orders.filter(o => o.status === 'placed');
    } else if (currentFilter === 'kitchen') {
      list = orders.filter(o => ['in_kitchen', 'preparing'].includes(o.status));
    } else if (currentFilter === 'food_ready') {
      list = orders.filter(o => o.status === 'food_ready');
    } else if (currentFilter === 'served') {
      list = orders.filter(o => o.status === 'served');
    }

    if (list.length === 0) {
      counterOrdersGrid.innerHTML = '';
      counterEmptyState.classList.remove('hidden');
      return;
    }

    counterEmptyState.classList.add('hidden');

    counterOrdersGrid.innerHTML = list.map(order => {
      const now = Date.now();
      const elapsedMins = Math.floor((now - order.createdAt) / 60000);
      const isNew = order.status === 'placed';

      // Status Badge
      let statusBadge = '';
      let borderClass = 'border-charcoal-800';

      if (order.status === 'placed') {
        borderClass = 'border-amber-500 ring-2 ring-amber-500/20';
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">NEW ORDER</span>`;
      } else if (order.status === 'confirmed') {
        borderClass = 'border-sky-500';
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">CONFIRMED</span>`;
      } else if (order.status === 'in_kitchen' || order.status === 'preparing') {
        borderClass = 'border-orange-500';
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">IN KITCHEN</span>`;
      } else if (order.status === 'food_ready') {
        borderClass = 'border-emerald-500 ring-2 ring-emerald-500/30';
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-bounce">FOOD READY</span>`;
      } else if (order.status === 'out_for_delivery') {
        borderClass = 'border-emerald-400';
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">OUT FOR DELIVERY</span>`;
      } else if (order.status === 'served') {
        borderClass = 'border-gold-500';
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold-500/20 text-gold-300 border border-gold-500/40">SERVED</span>`;
      } else if (order.status === 'rejected' || order.status === 'cancelled') {
        borderClass = 'border-red-800 opacity-60';
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">${order.status.toUpperCase()}</span>`;
      }

      // Actions Builder
      let actionButtons = '';
      if (order.status === 'placed') {
        actionButtons = `
          <div class="grid grid-cols-2 gap-2">
            <button onclick="window.counterAction('${order.id}', 'in_kitchen')" class="py-2.5 rounded-xl gold-gradient-bg text-charcoal-900 font-extrabold text-xs shadow hover:brightness-110 active:scale-95 transition flex items-center justify-center space-x-1">
              <span>Accept & Kitchen</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="window.rejectOrder('${order.id}')" class="py-2.5 rounded-xl bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-700/60 font-bold text-xs transition">
              Reject
            </button>
          </div>
        `;
      } else if (order.status === 'confirmed') {
        actionButtons = `
          <button onclick="window.counterAction('${order.id}', 'in_kitchen')" class="w-full py-2.5 rounded-xl gold-gradient-bg text-charcoal-900 font-extrabold text-xs shadow transition">
            Forward to Kitchen Display
          </button>
        `;
      } else if (order.status === 'in_kitchen' || order.status === 'preparing') {
        actionButtons = `
          <div class="p-2.5 rounded-xl bg-charcoal-800/80 border border-charcoal-700 text-center text-xs text-stone-400 flex items-center justify-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            <span>Chef Cooking on Tandoor/Tawa...</span>
          </div>
        `;
      } else if (order.status === 'food_ready') {
        actionButtons = `
          <button onclick="window.counterAction('${order.id}', 'out_for_delivery')" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-1.5 transition active:scale-95">
            <i data-lucide="navigation" class="w-4 h-4"></i>
            <span>Dispatch to Table ${order.tableCode}</span>
          </button>
        `;
      } else if (order.status === 'out_for_delivery') {
        actionButtons = `
          <button onclick="window.counterAction('${order.id}', 'served')" class="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow transition">
            Mark Food Served at Table
          </button>
        `;
      } else if (order.status === 'served') {
        actionButtons = `
          <button onclick="window.openBillModal('${order.id}')" class="w-full py-3 rounded-xl gold-gradient-bg text-charcoal-900 font-extrabold text-xs shadow-lg transition active:scale-95 flex items-center justify-center space-x-1.5">
            <i data-lucide="receipt" class="w-4 h-4"></i>
            <span>Settle Payment & Print Bill</span>
          </button>
        `;
      }

      return `
        <div class="bg-charcoal-900 rounded-2xl p-5 border ${borderClass} flex flex-col justify-between transition-all">
          
          <!-- Card Top -->
          <div>
            <div class="flex items-start justify-between pb-3 border-b border-charcoal-800">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-2xl font-black text-gold-400 font-serif-luxury tracking-tight">${order.tableCode}</span>
                  <span class="text-xs text-stone-400 font-mono">#${order.id}</span>
                </div>
                <div class="text-[11px] text-stone-400 mt-0.5">
                  Placed: ${new Date(order.createdAt).toLocaleTimeString()} (${elapsedMins}m ago)
                </div>
              </div>

              ${statusBadge}
            </div>

            <!-- Notes -->
            ${order.customerNotes ? `
              <div class="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                <strong>Customer Note:</strong> "${order.customerNotes}"
              </div>
            ` : ''}

            <!-- Items List -->
            <div class="mt-3.5 space-y-1.5">
              ${order.items.map(item => `
                <div class="flex justify-between items-center bg-charcoal-800/60 p-2 rounded-xl border border-charcoal-700/60 text-xs">
                  <div class="flex items-center space-x-2">
                    <span class="w-5 h-5 rounded-md gold-gradient-bg text-charcoal-900 font-black text-[10px] flex items-center justify-center">
                      ${item.quantity}
                    </span>
                    <span class="text-cream-100 font-semibold truncate max-w-[150px]">${item.name}</span>
                  </div>
                  <span class="font-mono text-stone-300">₹${item.price * item.quantity}</span>
                </div>
              `).join('')}
            </div>

            <div class="mt-3 pt-2 border-t border-charcoal-800 flex justify-between items-center text-xs">
              <span class="text-stone-400">Total (incl. GST):</span>
              <span class="text-base font-black text-gold-400 font-serif-luxury">₹${order.grandTotal}</span>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="mt-4 pt-3 border-t border-charcoal-800">
            ${actionButtons}
          </div>

        </div>
      `;
    }).join('');

    refreshIcons();
  }

  // Counter Actions
  window.counterAction = async (orderId, nextStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        const order = orders.find(o => o.id === orderId);
        if (order) order.status = nextStatus;
        renderCounter();
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.rejectOrder = async (orderId) => {
    const reason = prompt("Enter reason for rejecting order (e.g., Kitchen out of ingredients, closed):");
    if (!reason) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', reason })
      });
      const data = await res.json();
      if (data.success) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.status = 'rejected';
          order.rejectionReason = reason;
        }
        renderCounter();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Bill Generation Modal
  window.openBillModal = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    activeBillOrder = order;
    receiptBillNo.textContent = `BILL-2026-${Math.floor(1000 + Math.random()*9000)}`;
    receiptOrderNo.textContent = `#${order.id}`;
    receiptTableCode.textContent = order.tableCode;
    receiptDateTime.textContent = new Date().toLocaleString();

    receiptItemsTbody.innerHTML = order.items.map(i => `
      <tr class="text-stone-700">
        <td class="py-1">${i.name}</td>
        <td class="py-1 text-center font-bold">${i.quantity}</td>
        <td class="py-1 text-right">₹${i.price}</td>
        <td class="py-1 text-right font-bold">₹${i.price * i.quantity}</td>
      </tr>
    `).join('');

    receiptSubtotal.textContent = `₹${order.subtotal}`;
    receiptTax.textContent = `₹${order.taxAmount}`;
    receiptDiscount.textContent = `-₹0`;
    receiptGrandTotal.textContent = `₹${order.grandTotal}`;
    billDiscountInput.value = 0;

    billModal.classList.remove('hidden');
  };

  // Payment Method Selection
  payMethodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      payMethodBtns.forEach(b => {
        b.classList.remove('active', 'border-gold-500', 'bg-gold-50', 'text-gold-700');
        b.classList.add('border-stone-200', 'text-stone-700');
      });
      btn.classList.add('active', 'border-gold-500', 'bg-gold-50', 'text-gold-700');
      btn.classList.remove('border-stone-200');
      selectedPaymentMethod = btn.dataset.method;
    });
  });

  // Discount calculation
  billDiscountInput.addEventListener('input', () => {
    if (!activeBillOrder) return;
    const disc = parseFloat(billDiscountInput.value) || 0;
    const finalTotal = Math.max(0, activeBillOrder.grandTotal - disc);
    receiptDiscount.textContent = `-₹${disc}`;
    receiptGrandTotal.textContent = `₹${finalTotal}`;
  });

  closeBillModalBtn.addEventListener('click', () => {
    billModal.classList.add('hidden');
    activeBillOrder = null;
  });

  confirmPaymentBtn.addEventListener('click', async () => {
    if (!activeBillOrder) return;

    const discount = parseFloat(billDiscountInput.value) || 0;
    try {
      const res = await fetch(`/api/orders/${activeBillOrder.id}/bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: selectedPaymentMethod,
          discount
        })
      });

      const data = await res.json();
      if (data.success) {
        // Trigger print
        window.print();
        billModal.classList.add('hidden');
        activeBillOrder = null;
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
      alert("Error recording payment.");
    }
  });

  fetchOrders();
});
