// Kitchen Display System (KDS) Logic - Cooking Staff
document.addEventListener('DOMContentLoaded', () => {
  const refreshIcons = () => {
    if (window.lucide) window.lucide.createIcons();
  };

  let orders = [];
  let currentFilter = 'all';
  let isMuted = false;

  // DOM Elements
  const kitchenGrid = document.getElementById('kitchenGrid');
  const kitchenEmptyState = document.getElementById('kitchenEmptyState');
  const activeCountBadge = document.getElementById('activeCountBadge');
  const kitchenClock = document.getElementById('kitchenClock');
  const toggleAudioBtn = document.getElementById('toggleAudioBtn');
  const audioIcon = document.getElementById('audioIcon');
  const audioText = document.getElementById('audioText');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const filterButtons = document.querySelectorAll('.kds-filter-btn');

  // Clock Update
  setInterval(() => {
    const d = new Date();
    kitchenClock.textContent = d.toLocaleTimeString();
  }, 1000);

  // Audio Toggle
  toggleAudioBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (window.restaurantAudio) {
      window.restaurantAudio.muted = isMuted;
    }
    audioText.textContent = isMuted ? "Sound OFF" : "Sound ON";
    audioIcon.className = isMuted ? "w-4 h-4 text-red-400" : "w-4 h-4 text-emerald-400";
    if (!isMuted && window.restaurantAudio) {
      window.restaurantAudio.playOrderBell();
    }
  });

  // Fullscreen
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  });

  // Connect to Socket.io
  const socket = io();

  socket.on('connect', () => {
    console.log('[Kitchen KDS] Connected to live kitchen server');
    socket.emit('kitchen:join');
  });

  // Socket Events
  socket.on('order:created', (newOrder) => {
    console.log('[KDS] New order received:', newOrder.id);
    const existingIndex = orders.findIndex(o => o.id === newOrder.id);
    if (existingIndex >= 0) {
      orders[existingIndex] = newOrder;
    } else {
      orders.unshift(newOrder);
    }

    if (window.restaurantAudio) window.restaurantAudio.playOrderBell();
    renderKitchen();
  });

  socket.on('order:cancelled', (cancelledOrder) => {
    console.log('[KDS] Order cancelled:', cancelledOrder.id);
    const order = orders.find(o => o.id === cancelledOrder.id);
    if (order) {
      order.status = 'cancelled';
      order.cancelledAt = cancelledOrder.cancelledAt;
    }
    if (window.restaurantAudio) window.restaurantAudio.playCancelSound();
    renderKitchen();
  });

  socket.on('order:locked', (lockedOrder) => {
    console.log('[KDS] Order locked (30s elapsed):', lockedOrder.id);
    const order = orders.find(o => o.id === lockedOrder.id);
    if (order) {
      order.status = 'confirmed';
      order.expiresCancelAt = lockedOrder.expiresCancelAt;
    }
    if (window.restaurantAudio) window.restaurantAudio.playCookingAlert();
    renderKitchen();
  });

  socket.on('order:updated', (updatedOrder) => {
    const index = orders.findIndex(o => o.id === updatedOrder.id);
    if (index >= 0) {
      orders[index] = updatedOrder;
      renderKitchen();
    }
  });

  socket.on('order:refresh', () => {
    fetchOrders();
  });

  // Fetch initial orders
  async function fetchOrders() {
    try {
      const res = await fetch('/api/orders');
      orders = await res.json();
      renderKitchen();
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  }

  // Filter clicks
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active', 'bg-brand-600', 'text-white');
        b.classList.add('bg-slate-800', 'text-slate-300');
      });
      btn.classList.add('active', 'bg-brand-600', 'text-white');
      btn.classList.remove('bg-slate-800', 'text-slate-300');

      currentFilter = btn.dataset.filter;
      renderKitchen();
    });
  });

  // Render Kitchen Tickets
  function renderKitchen() {
    // Filter active orders (excluding served and cancelled from active tally)
    const activeOrders = orders.filter(o => !['served', 'cancelled'].includes(o.status));
    activeCountBadge.textContent = activeOrders.length;

    // Counts for filter pills
    document.getElementById('countAll').textContent = activeOrders.length;
    document.getElementById('countPending').textContent = orders.filter(o => o.status === 'pending_confirmation').length;
    document.getElementById('countConfirmed').textContent = orders.filter(o => o.status === 'confirmed').length;
    document.getElementById('countCooking').textContent = orders.filter(o => o.status === 'cooking').length;
    document.getElementById('countReady').textContent = orders.filter(o => o.status === 'ready').length;

    let displayOrders = orders;
    if (currentFilter === 'all') {
      displayOrders = orders.filter(o => o.status !== 'served');
    } else if (currentFilter === 'pending') {
      displayOrders = orders.filter(o => o.status === 'pending_confirmation');
    } else if (currentFilter === 'confirmed') {
      displayOrders = orders.filter(o => o.status === 'confirmed');
    } else if (currentFilter === 'cooking') {
      displayOrders = orders.filter(o => o.status === 'cooking');
    } else if (currentFilter === 'ready') {
      displayOrders = orders.filter(o => o.status === 'ready');
    }

    if (displayOrders.length === 0) {
      kitchenGrid.innerHTML = '';
      kitchenEmptyState.classList.remove('hidden');
      return;
    }

    kitchenEmptyState.classList.add('hidden');

    kitchenGrid.innerHTML = displayOrders.map(order => {
      const isPending = order.status === 'pending_confirmation';
      const isCancelled = order.status === 'cancelled';
      const isCooking = order.status === 'cooking';
      const isReady = order.status === 'ready';
      const isConfirmed = order.status === 'confirmed';

      const now = Date.now();
      const remainingSec = Math.max(0, Math.ceil((order.expiresCancelAt - now) / 1000));
      const elapsedMins = Math.floor((now - order.createdAt) / 60000);

      // Card Header Color & Status Badge
      let statusBadgeHtml = '';
      let borderClass = 'border-slate-700';

      if (isPending) {
        borderClass = 'border-amber-500/80 shadow-lg shadow-amber-500/10';
        statusBadgeHtml = `
          <div class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold animate-pulse">
            <i data-lucide="clock" class="w-3.5 h-3.5 text-amber-400"></i>
            <span>30s Cancel Window: <span class="text-white text-sm font-black" data-timer-order="${order.id}">${remainingSec}s</span></span>
          </div>
        `;
      } else if (isCancelled) {
        borderClass = 'border-red-600/70 bg-red-950/20';
        statusBadgeHtml = `
          <div class="inline-flex items-center px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold">
            CANCELLED BY GUEST (30s)
          </div>
        `;
      } else if (isConfirmed) {
        borderClass = 'border-sky-500/80 shadow-lg shadow-sky-500/10';
        statusBadgeHtml = `
          <div class="inline-flex items-center px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 text-xs font-bold">
            CONFIRMED / QUEUED
          </div>
        `;
      } else if (isCooking) {
        borderClass = 'border-orange-500/90 shadow-lg shadow-orange-500/20';
        statusBadgeHtml = `
          <div class="inline-flex items-center px-2.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-bold">
            🔥 COOKING IN PROGRESS
          </div>
        `;
      } else if (isReady) {
        borderClass = 'border-emerald-500/90 shadow-lg shadow-emerald-500/20';
        statusBadgeHtml = `
          <div class="inline-flex items-center px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
            ✅ READY FOR TABLE
          </div>
        `;
      }

      // Action Button
      let actionButtonHtml = '';
      if (isPending) {
        actionButtonHtml = `
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <span class="text-xs text-amber-300 font-semibold">⏳ Guest may cancel within 30s. Cooking locks automatically.</span>
          </div>
        `;
      } else if (isConfirmed) {
        actionButtonHtml = `
          <button onclick="window.updateStatus('${order.id}', 'cooking')" class="w-full py-3 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center space-x-2 transition">
            <i data-lucide="flame" class="w-4 h-4"></i>
            <span>Start Cooking Now</span>
          </button>
        `;
      } else if (isCooking) {
        actionButtonHtml = `
          <button onclick="window.updateStatus('${order.id}', 'ready')" class="w-full py-3 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center space-x-2 transition">
            <i data-lucide="check-circle" class="w-4 h-4"></i>
            <span>Mark Food Ready</span>
          </button>
        `;
      } else if (isReady) {
        actionButtonHtml = `
          <button onclick="window.updateStatus('${order.id}', 'served')" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition">
            <i data-lucide="utensils" class="w-4 h-4"></i>
            <span>Delivered & Served</span>
          </button>
        `;
      } else if (isCancelled) {
        actionButtonHtml = `
          <div class="p-2.5 rounded-xl bg-red-900/30 border border-red-800 text-center text-xs text-red-300">
            Order voided within grace window. No preparation required.
          </div>
        `;
      }

      return `
        <div class="kds-card rounded-2xl p-5 border ${borderClass} flex flex-col justify-between transition-all duration-200">
          
          <!-- Card Header -->
          <div>
            <div class="flex items-start justify-between pb-3 border-b border-slate-700/80">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-2xl font-black text-amber-400 font-mono tracking-tight">TABLE ${order.tableNumber}</span>
                  <span class="text-xs text-slate-400 font-mono font-medium">#${order.id}</span>
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  Placed: ${new Date(order.createdAt).toLocaleTimeString()} (${elapsedMins}m ago)
                </div>
              </div>

              <!-- Status Badge -->
              ${statusBadgeHtml}
            </div>

            <!-- Customer Special Notes for Chef -->
            ${order.customerNotes ? `
              <div class="mt-3 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs">
                <span class="font-bold uppercase tracking-wider text-[10px] text-amber-400 block mb-0.5">⚠️ GUEST INSTRUCTIONS:</span>
                "${order.customerNotes}"
              </div>
            ` : ''}

            <!-- Items List -->
            <div class="mt-4 space-y-2.5">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Items to Prepare:</div>
              <div class="space-y-2">
                ${order.items.map(item => `
                  <div class="flex items-center justify-between bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                    <div class="flex items-center space-x-2.5">
                      <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center font-mono">
                        ${item.quantity}x
                      </span>
                      <span class="text-sm font-bold text-slate-100">${item.name}</span>
                    </div>
                    <span class="text-xs text-slate-400 font-mono">₹${item.price * item.quantity}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="mt-5 pt-3 border-t border-slate-800">
            ${actionButtonHtml}
          </div>

        </div>
      `;
    }).join('');

    refreshIcons();
  }

  // Update Status Handlers
  window.updateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        const order = orders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        renderKitchen();
        if (newStatus === 'cooking' && window.restaurantAudio) {
          window.restaurantAudio.playCookingAlert();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Live Timer Tick for Active 30s Grace Orders
  setInterval(() => {
    const timerElements = document.querySelectorAll('[data-timer-order]');
    timerElements.forEach(el => {
      const orderId = el.getAttribute('data-timer-order');
      const order = orders.find(o => o.id === orderId);
      if (order && order.status === 'pending_confirmation') {
        const rem = Math.max(0, Math.ceil((order.expiresCancelAt - Date.now()) / 1000));
        el.textContent = `${rem}s`;
        if (rem === 0) {
          order.status = 'confirmed';
          renderKitchen();
        }
      }
    });
  }, 500);

  // Initial Fetch
  fetchOrders();
});
