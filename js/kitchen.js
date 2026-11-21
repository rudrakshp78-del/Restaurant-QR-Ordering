// SMARTDINE - Chef Kitchen Display System (KDS) Operations
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
  const statKitchenActive = document.getElementById('statKitchenActive');
  const kitchenClock = document.getElementById('kitchenClock');
  const toggleAudioBtn = document.getElementById('toggleAudioBtn');
  const audioIcon = document.getElementById('audioIcon');
  const audioText = document.getElementById('audioText');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const kdsFilterBtns = document.querySelectorAll('.kds-filter-btn');

  // Clock
  setInterval(() => {
    kitchenClock.textContent = new Date().toLocaleTimeString();
  }, 1000);

  // Audio Toggle
  toggleAudioBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (window.restaurantAudio) window.restaurantAudio.muted = isMuted;
    audioText.textContent = isMuted ? "Sound OFF" : "Sound ON";
    audioIcon.className = isMuted ? "w-4 h-4 text-red-400" : "w-4 h-4 text-emerald-400";
    if (!isMuted && window.restaurantAudio) window.restaurantAudio.playCookingAlert();
  });

  // Fullscreen
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
      document.exitFullscreen();
    }
  });

  // Socket.IO
  const socket = io();
  socket.on('connect', () => {
    console.log('[KDS] Connected to live kitchen server');
    socket.emit('kitchen:join');
  });

  socket.on('kitchen:new_ticket', (order) => {
    orders.unshift(order);
    if (window.restaurantAudio) window.restaurantAudio.playCookingAlert();
    renderKDS();
  });

  socket.on('order:status_update', (order) => {
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
    } else if (['in_kitchen', 'preparing', 'food_ready'].includes(order.status)) {
      orders.unshift(order);
    }
    renderKDS();
  });

  socket.on('order:item_updated', ({ orderId, itemId, isPrepared }) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const item = order.items.find(i => i.id === itemId);
      if (item) item.isPrepared = isPrepared;
      renderKDS();
    }
  });

  // Filter Buttons
  kdsFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      kdsFilterBtns.forEach(b => {
        b.classList.remove('active', 'bg-gold-500', 'text-charcoal-900');
        b.classList.add('bg-charcoal-800', 'text-stone-300');
      });
      btn.classList.add('active', 'bg-gold-500', 'text-charcoal-900');
      btn.classList.remove('bg-charcoal-800', 'text-stone-300');

      currentFilter = btn.dataset.kdsFilter;
      renderKDS();
    });
  });

  async function fetchOrders() {
    try {
      const res = await fetch('/api/orders');
      const allOrders = await res.json();
      // Keep only kitchen-relevant tickets
      orders = allOrders.filter(o => ['in_kitchen', 'preparing', 'food_ready'].includes(o.status));
      renderKDS();
    } catch (e) {
      console.error(e);
    }
  }

  function renderKDS() {
    const newCount = orders.filter(o => o.status === 'in_kitchen').length;
    const prepCount = orders.filter(o => o.status === 'preparing').length;
    const readyCount = orders.filter(o => o.status === 'food_ready').length;

    statKitchenActive.textContent = newCount + prepCount;
    document.getElementById('countKdsAll').textContent = orders.length;
    document.getElementById('countKdsNew').textContent = newCount;
    document.getElementById('countKdsPrep').textContent = prepCount;
    document.getElementById('countKdsReady').textContent = readyCount;

    let list = orders;
    if (currentFilter === 'new') {
      list = orders.filter(o => o.status === 'in_kitchen');
    } else if (currentFilter === 'preparing') {
      list = orders.filter(o => o.status === 'preparing');
    } else if (currentFilter === 'ready') {
      list = orders.filter(o => o.status === 'food_ready');
    }

    if (list.length === 0) {
      kitchenGrid.innerHTML = '';
      kitchenEmptyState.classList.remove('hidden');
      return;
    }

    kitchenEmptyState.classList.add('hidden');

    kitchenGrid.innerHTML = list.map(order => {
      const isNew = order.status === 'in_kitchen';
      const isPreparing = order.status === 'preparing';
      const isReady = order.status === 'food_ready';

      const now = Date.now();
      const elapsedMins = Math.floor((now - (order.kitchenSentAt || order.createdAt)) / 60000);

      let borderClass = 'border-charcoal-700';
      let statusBadge = '';

      if (isNew) {
        borderClass = 'border-amber-500 ring-2 ring-amber-500/20';
        statusBadge = `<span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">NEW TICKET</span>`;
      } else if (isPreparing) {
        borderClass = 'border-orange-500 ring-2 ring-orange-500/20';
        statusBadge = `<span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40">PREPARING 🔥</span>`;
      } else if (isReady) {
        borderClass = 'border-emerald-500 ring-2 ring-emerald-500/20';
        statusBadge = `<span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">READY ON PASS ✅</span>`;
      }

      // Check if all items prepared
      const allItemsPrepared = order.items.every(i => i.isPrepared);

      return `
        <div class="bg-charcoal-900 rounded-2xl p-5 border ${borderClass} flex flex-col justify-between shadow-xl transition">
          
          <!-- Ticket Header -->
          <div>
            <div class="flex items-start justify-between pb-3 border-b border-charcoal-800">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-3xl font-black text-gold-400 font-serif-luxury tracking-tight">${order.tableCode}</span>
                  <span class="text-xs text-stone-400 font-mono">#${order.id}</span>
                </div>
                <div class="text-[11px] text-stone-400 mt-0.5">
                  In Kitchen: ${elapsedMins}m ago
                </div>
              </div>

              ${statusBadge}
            </div>

            <!-- Notes -->
            ${order.customerNotes ? `
              <div class="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                <span class="font-extrabold uppercase text-[10px] text-amber-400 block mb-0.5">⚠️ CHEF NOTE:</span>
                "${order.customerNotes}"
              </div>
            ` : ''}

            <!-- Individual Dishes Checklist -->
            <div class="mt-4 space-y-2">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Tap dish to mark prepared:</div>
              ${order.items.map(item => `
                <div onclick="window.toggleDishPrepared('${order.id}', '${item.id}', ${!item.isPrepared})" class="cursor-pointer p-2.5 rounded-xl border transition flex items-center justify-between ${item.isPrepared ? 'bg-emerald-950/30 border-emerald-600/60 line-through text-stone-400' : 'bg-charcoal-800/80 border-charcoal-700 text-cream-100 hover:border-gold-500'}">
                  <div class="flex items-center space-x-2.5">
                    <span class="w-6 h-6 rounded-lg ${item.isPrepared ? 'bg-emerald-600 text-white' : 'gold-gradient-bg text-charcoal-900'} font-black text-xs flex items-center justify-center">
                      ${item.isPrepared ? '✓' : item.quantity + 'x'}
                    </span>
                    <span class="text-xs font-bold">${item.name}</span>
                  </div>
                  <span class="text-[10px] uppercase font-bold ${item.isPrepared ? 'text-emerald-400' : 'text-stone-500'}">
                    ${item.isPrepared ? 'PREPARED' : 'PENDING'}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Bottom Big Touch Actions -->
          <div class="mt-5 pt-3 border-t border-charcoal-800">
            ${isNew ? `
              <button onclick="window.setOrderStatus('${order.id}', 'preparing')" class="w-full py-3.5 gold-gradient-bg hover:brightness-110 active:scale-95 text-charcoal-900 font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center space-x-2">
                <i data-lucide="flame" class="w-5 h-5"></i>
                <span>Accept & Start Preparing</span>
              </button>
            ` : (isPreparing ? `
              <button onclick="window.setOrderStatus('${order.id}', 'food_ready')" class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 ${allItemsPrepared ? 'animate-pulse ring-2 ring-emerald-400' : ''}">
                <i data-lucide="check-circle" class="w-5 h-5"></i>
                <span>Mark Complete Order as Ready</span>
              </button>
            ` : `
              <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-center text-xs text-emerald-300 font-bold">
                Food Ready on Pass • Counter Notified
              </div>
            `)}
          </div>

        </div>
      `;
    }).join('');

    refreshIcons();
  }

  // Action handlers
  window.setOrderStatus = async (orderId, nextStatus) => {
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
        renderKDS();
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.toggleDishPrepared = async (orderId, itemId, isPrepared) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/prep`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrepared })
      });
      const data = await res.json();
      if (data.success) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const item = order.items.find(i => i.id === itemId);
          if (item) item.isPrepared = isPrepared;
          renderKDS();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  fetchOrders();
});
