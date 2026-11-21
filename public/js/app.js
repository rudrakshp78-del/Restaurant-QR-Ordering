// Customer App Logic - Table QR Ordering & 30-Second Cancellation Timer
document.addEventListener('DOMContentLoaded', () => {
  // Lucide icons init helper
  const refreshIcons = () => {
    if (window.lucide) window.lucide.createIcons();
  };

  // State
  let menu = [];
  let cart = []; // Array of { id, name, price, quantity, isVeg, image }
  let currentCategory = 'all';
  let searchQuery = '';
  let activeOrder = null;
  let countdownInterval = null;

  // Detect table from URL: e.g., ?table=3
  const urlParams = new URLSearchParams(window.location.search);
  let currentTable = parseInt(urlParams.get('table'), 10) || 1;

  // Socket.io initialization
  const socket = io();

  socket.on('connect', () => {
    console.log(`Connected to restaurant server. Joining table-${currentTable}`);
    socket.emit('table:join', currentTable);
  });

  // Listen for live updates to this table's order
  socket.on('order:status_changed', (order) => {
    if (activeOrder && activeOrder.id === order.id) {
      activeOrder = order;
      updateOrderStatusUI(order);
    }
  });

  socket.on('order:locked', (order) => {
    if (activeOrder && activeOrder.id === order.id) {
      activeOrder = order;
      transitionToLockedState();
    }
  });

  // DOM Elements
  const headerTableText = document.getElementById('headerTableText');
  const cartTableSubtitle = document.getElementById('cartTableSubtitle');
  const heroTableIndicator = document.getElementById('heroTableIndicator');
  const heroPickTableBtn = document.getElementById('heroPickTableBtn');
  const switchTableBtn = document.getElementById('switchTableBtn');
  const tablePickerModal = document.getElementById('tablePickerModal');
  const closeTablePickerBtn = document.getElementById('closeTablePickerBtn');
  const menuGrid = document.getElementById('menuGrid');
  const noResultsState = document.getElementById('noResultsState');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categoryButtons = document.querySelectorAll('.category-btn');
  const currentSectionTitle = document.getElementById('currentSectionTitle');
  const itemsCountBadge = document.getElementById('itemsCountBadge');

  // Cart Elements
  const headerCartBtn = document.getElementById('headerCartBtn');
  const cartCountBadge = document.getElementById('cartCountBadge');
  const floatingCartBar = document.getElementById('floatingCartBar');
  const floatingCartCount = document.getElementById('floatingCartCount');
  const floatingCartTotal = document.getElementById('floatingCartTotal');
  const viewCartBtn = document.getElementById('viewCartBtn');
  const cartModal = document.getElementById('cartModal');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const cookingNotesInput = document.getElementById('cookingNotesInput');
  const billSubtotal = document.getElementById('billSubtotal');
  const billTaxes = document.getElementById('billTaxes');
  const billGrandTotal = document.getElementById('billGrandTotal');
  const placeOrderBtn = document.getElementById('placeOrderBtn');

  // Status & 30s Modal Elements
  const orderStatusModal = document.getElementById('orderStatusModal');
  const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
  const modalTableBadge = document.getElementById('modalTableBadge');
  const modalOrderId = document.getElementById('modalOrderId');
  const gracePeriodSection = document.getElementById('gracePeriodSection');
  const countdownProgressRing = document.getElementById('countdownProgressRing');
  const countdownNumber = document.getElementById('countdownNumber');
  const cancelOrderBtn = document.getElementById('cancelOrderBtn');
  const cancelBtnText = document.getElementById('cancelBtnText');
  const lockedCookingSection = document.getElementById('lockedCookingSection');
  const cancelledSection = document.getElementById('cancelledSection');
  const backToMenuBtn = document.getElementById('backToMenuBtn');
  const orderMoreItemsBtn = document.getElementById('orderMoreItemsBtn');
  const modalItemsSummary = document.getElementById('modalItemsSummary');

  // Update Table Display
  function setTable(tableNum) {
    currentTable = tableNum;
    headerTableText.textContent = `Table ${currentTable}`;
    if (heroTableIndicator) heroTableIndicator.textContent = `TABLE ${currentTable}`;
    cartTableSubtitle.textContent = `Ordering for Table ${currentTable} • Gajanan Hotel`;
    modalTableBadge.textContent = `Table ${currentTable}`;
    
    // Update URL query without page refresh
    const newUrl = `${window.location.pathname}?table=${currentTable}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    socket.emit('table:join', currentTable);
  }

  setTable(currentTable);

  // Table Switcher Handlers
  switchTableBtn.addEventListener('click', () => tablePickerModal.classList.remove('hidden'));
  if (heroPickTableBtn) {
    heroPickTableBtn.addEventListener('click', () => tablePickerModal.classList.remove('hidden'));
  }
  closeTablePickerBtn.addEventListener('click', () => tablePickerModal.classList.add('hidden'));

  document.querySelectorAll('.table-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = parseInt(btn.dataset.table, 10);
      setTable(selected);
      tablePickerModal.classList.add('hidden');
    });
  });

  // Fetch Menu from Server
  async function fetchMenu() {
    try {
      const res = await fetch('/api/menu');
      menu = await res.json();
      renderMenu();
    } catch (err) {
      console.error('Failed to load menu:', err);
      menuGrid.innerHTML = `
        <div class="col-span-2 text-center py-10 text-red-500">
          <p class="font-bold">Error loading menu items</p>
          <p class="text-xs text-slate-500">Please check server connection.</p>
        </div>
      `;
    }
  }

  // Render Menu Items
  function renderMenu() {
    let filtered = menu;

    if (currentCategory !== 'all') {
      filtered = filtered.filter(item => item.category === currentCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
      );
    }

    itemsCountBadge.textContent = `(${filtered.length} items)`;

    if (filtered.length === 0) {
      menuGrid.innerHTML = '';
      noResultsState.classList.remove('hidden');
      return;
    }

    noResultsState.classList.add('hidden');

    menuGrid.innerHTML = filtered.map(item => {
      const cartItem = cart.find(c => c.id === item.id);
      const qty = cartItem ? cartItem.quantity : 0;

      return `
        <div class="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div class="flex space-x-3">
            <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
              <img 
                src="${item.image}" 
                alt="${item.name}" 
                class="w-full h-full object-cover transition duration-300 hover:scale-105" 
                loading="lazy"
                onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80'"
              />
              ${item.bestseller ? `
                <span class="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                  ★ BEST
                </span>
              ` : ''}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-1.5">
                <span class="inline-block w-2.5 h-2.5 rounded-full border border-emerald-600 p-[1px]">
                  <span class="block w-full h-full rounded-full bg-emerald-600"></span>
                </span>
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${item.categoryLabel}</span>
              </div>

              <h4 class="font-bold text-slate-900 text-sm leading-snug truncate mt-0.5">${item.name}</h4>
              <p class="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">${item.description}</p>
              
              <div class="flex items-baseline space-x-2 mt-2">
                <span class="text-sm font-extrabold text-slate-900">₹${item.price}</span>
                <span class="text-[10px] text-amber-600 font-semibold flex items-center">
                  ★ ${item.rating}
                </span>
              </div>
            </div>
          </div>

          <!-- Bottom Action -->
          <div class="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between">
            <span class="text-[10px] text-slate-400">Freshly Cooked</span>
            
            ${qty > 0 ? `
              <div class="flex items-center space-x-2 bg-brand-50 border border-brand-200 rounded-xl px-2 py-1">
                <button onclick="window.modifyQuantity('${item.id}', -1)" class="w-6 h-6 rounded-lg bg-white text-brand-700 font-bold shadow-sm hover:bg-brand-100 flex items-center justify-center text-xs">-</button>
                <span class="font-bold text-brand-900 text-xs px-1">${qty}</span>
                <button onclick="window.modifyQuantity('${item.id}', 1)" class="w-6 h-6 rounded-lg bg-brand-600 text-white font-bold shadow-sm hover:bg-brand-700 flex items-center justify-center text-xs">+</button>
              </div>
            ` : `
              <button onclick="window.addToCart('${item.id}')" class="px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-brand-200 hover:border-transparent font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1">
                <span>+ ADD</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    refreshIcons();
  }

  // Cart Management Functions
  window.addToCart = (itemId) => {
    const item = menu.find(m => m.id === itemId);
    if (!item) return;

    const existing = cart.find(c => c.id === itemId);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        category: item.category,
        quantity: 1
      });
    }

    if (window.restaurantAudio) window.restaurantAudio.playOrderBell();
    updateCartUI();
    renderMenu();
  };

  window.modifyQuantity = (itemId, delta) => {
    const index = cart.findIndex(c => c.id === itemId);
    if (index === -1) return;

    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }

    updateCartUI();
    renderMenu();
  };

  function updateCartUI() {
    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const taxes = Math.round(subtotal * 0.05); // 5% GST
    const grandTotal = subtotal + taxes;

    // Badges & Floating bar
    if (totalCount > 0) {
      cartCountBadge.textContent = totalCount;
      cartCountBadge.classList.remove('hidden');
      floatingCartCount.textContent = totalCount;
      floatingCartTotal.textContent = `₹${grandTotal}`;
      floatingCartBar.classList.remove('hidden');
    } else {
      cartCountBadge.classList.add('hidden');
      floatingCartBar.classList.add('hidden');
      cartModal.classList.add('hidden');
    }

    // Bill breakdown
    billSubtotal.textContent = `₹${subtotal}`;
    billTaxes.textContent = `₹${taxes}`;
    billGrandTotal.textContent = `₹${grandTotal}`;

    // Render Cart Modal Items
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="text-center py-10 text-slate-400">
          <i data-lucide="shopping-bag" class="w-12 h-12 mx-auto stroke-1 mb-2"></i>
          <p class="text-sm font-semibold">Your table cart is empty</p>
          <p class="text-xs">Add delicious dishes from the menu to order</p>
        </div>
      `;
    } else {
      cartItemsContainer.innerHTML = cart.map(item => `
        <div class="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div class="flex items-center space-x-3">
            <img src="${item.image}" class="w-12 h-12 rounded-lg object-cover" onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80'">
            <div>
              <h5 class="text-xs font-bold text-slate-800">${item.name}</h5>
              <div class="text-[11px] text-slate-500">₹${item.price} each</div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <button onclick="window.modifyQuantity('${item.id}', -1)" class="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">-</button>
            <span class="text-xs font-bold text-slate-800 px-1">${item.quantity}</span>
            <button onclick="window.modifyQuantity('${item.id}', 1)" class="w-6 h-6 rounded-md bg-brand-600 text-white font-bold flex items-center justify-center text-xs">+</button>
            <span class="text-xs font-extrabold text-slate-900 ml-2 w-12 text-right">₹${item.price * item.quantity}</span>
          </div>
        </div>
      `).join('');
    }

    refreshIcons();
  }

  // Open & Close Cart
  const openCart = () => {
    if (cart.length > 0) cartModal.classList.remove('hidden');
  };
  const closeCart = () => cartModal.classList.add('hidden');

  headerCartBtn.addEventListener('click', openCart);
  viewCartBtn.addEventListener('click', openCart);
  closeCartBtn.addEventListener('click', closeCart);

  // Search & Filter Interactions
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.classList.toggle('hidden', !searchQuery);
    renderMenu();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderMenu();
  });

  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach(b => {
        b.classList.remove('active', 'bg-brand-600', 'text-white', 'shadow-sm', 'shadow-brand-500/20');
        b.classList.add('bg-white', 'text-slate-700', 'border', 'border-slate-200');
      });

      btn.classList.add('active', 'bg-brand-600', 'text-white', 'shadow-sm', 'shadow-brand-500/20');
      btn.classList.remove('bg-white', 'text-slate-700', 'border', 'border-slate-200');

      currentCategory = btn.dataset.category;
      renderMenu();
    });
  });

  // ==================== PLACE ORDER & 30-SECOND COUNTDOWN LOGIC ====================
  placeOrderBtn.addEventListener('click', async () => {
    if (cart.length === 0) return;

    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = `<span>Sending to Kitchen...</span>`;

    try {
      const orderPayload = {
        tableNumber: currentTable,
        items: cart,
        customerNotes: cookingNotesInput.value.trim(),
        customerName: `Table ${currentTable} Guest`
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to place order.');
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = `<span>Send Order to Kitchen</span> <i data-lucide="send" class="w-4 h-4"></i>`;
        refreshIcons();
        return;
      }

      // Order created! Save and trigger 30s countdown modal
      activeOrder = data.order;
      
      // Clear Cart
      cart = [];
      cookingNotesInput.value = '';
      updateCartUI();
      closeCart();

      // Show Order Status Modal with 30-second Grace Period
      showOrderStatusModal(activeOrder);

      if (window.restaurantAudio) window.restaurantAudio.playOrderBell();

    } catch (err) {
      console.error(err);
      alert('Network error while placing order. Please try again.');
    } finally {
      placeOrderBtn.disabled = false;
      placeOrderBtn.innerHTML = `<span>Send Order to Kitchen</span> <i data-lucide="send" class="w-4 h-4"></i>`;
      refreshIcons();
    }
  });

  // Show Order Status Modal & Start 30s Countdown
  function showOrderStatusModal(order) {
    modalTableBadge.textContent = `Table ${order.tableNumber}`;
    modalOrderId.textContent = `#${order.id}`;

    // Render ordered items summary
    modalItemsSummary.innerHTML = `
      <div class="font-bold text-slate-700 mb-1">Your Order (${order.items.length} items):</div>
      <div class="space-y-1">
        ${order.items.map(i => `
          <div class="flex justify-between text-[11px]">
            <span>${i.quantity}x ${i.name}</span>
            <span class="font-semibold">₹${i.price * i.quantity}</span>
          </div>
        `).join('')}
      </div>
      ${order.customerNotes ? `
        <div class="mt-2 text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
          <strong>Note for Chef:</strong> ${order.customerNotes}
        </div>
      ` : ''}
    `;

    orderStatusModal.classList.remove('hidden');

    if (order.status === 'pending_confirmation') {
      startCountdown(order);
    } else {
      transitionToLockedState();
    }
  }

  // 30-SECOND TIMER RUNNER
  function startCountdown(order) {
    if (countdownInterval) clearInterval(countdownInterval);

    gracePeriodSection.classList.remove('hidden');
    lockedCookingSection.classList.add('hidden');
    cancelledSection.classList.add('hidden');

    const totalDuration = 30; // 30 seconds
    const circumference = 2 * Math.PI * 42; // ~263.89
    countdownProgressRing.style.strokeDasharray = `${circumference}`;

    function tick() {
      const now = Date.now();
      const remainingMs = Math.max(0, order.expiresCancelAt - now);
      const remainingSec = Math.ceil(remainingMs / 1000);

      countdownNumber.textContent = remainingSec;
      cancelBtnText.textContent = `Cancel Order (${remainingSec}s)`;

      // Update circular stroke offset smoothly
      const progressFraction = remainingSec / totalDuration;
      const offset = circumference * (1 - progressFraction);
      countdownProgressRing.style.strokeDashoffset = `${offset}`;

      // Change stroke color as urgency increases
      if (remainingSec <= 10) {
        countdownProgressRing.style.stroke = '#ef4444'; // Red
      } else {
        countdownProgressRing.style.stroke = '#ea580c'; // Orange
      }

      if (remainingSec <= 0) {
        clearInterval(countdownInterval);
        transitionToLockedState();
      }
    }

    tick();
    countdownInterval = setInterval(tick, 250);
  }

  // Transition from Grace Period to Locked Cooking
  function transitionToLockedState() {
    if (countdownInterval) clearInterval(countdownInterval);

    gracePeriodSection.classList.add('hidden');
    lockedCookingSection.classList.remove('hidden');
    cancelledSection.classList.add('hidden');

    if (window.restaurantAudio) window.restaurantAudio.playCookingAlert();
  }

  // Cancel Order Click (Strictly within 30 seconds)
  cancelOrderBtn.addEventListener('click', async () => {
    if (!activeOrder) return;

    const confirmed = confirm("Are you sure you want to cancel your order? This will remove it from the kitchen queue.");
    if (!confirmed) return;

    cancelOrderBtn.disabled = true;
    cancelBtnText.textContent = "Cancelling...";

    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: "Customer clicked cancel within 30 seconds" })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Cannot cancel order. The 30-second window has expired!");
        transitionToLockedState();
        return;
      }

      // Successfully cancelled
      if (countdownInterval) clearInterval(countdownInterval);
      gracePeriodSection.classList.add('hidden');
      lockedCookingSection.classList.add('hidden');
      cancelledSection.classList.remove('hidden');

      if (window.restaurantAudio) window.restaurantAudio.playCancelSound();

    } catch (err) {
      console.error(err);
      alert('Error cancelling order.');
    } finally {
      cancelOrderBtn.disabled = false;
    }
  });

  // Modal actions
  closeStatusModalBtn.addEventListener('click', () => orderStatusModal.classList.add('hidden'));
  backToMenuBtn.addEventListener('click', () => orderStatusModal.classList.add('hidden'));
  orderMoreItemsBtn.addEventListener('click', () => orderStatusModal.classList.add('hidden'));

  // Update Live Kitchen Tracker UI for status changes
  function updateOrderStatusUI(order) {
    const stepCookingIcon = document.getElementById('stepCookingIcon');
    const stepCookingTitle = document.getElementById('stepCookingTitle');
    const stepReadyContainer = document.getElementById('stepReadyContainer');

    if (order.status === 'cooking') {
      stepCookingTitle.textContent = "Chef Actively Cooking Now 🔥";
      stepCookingIcon.classList.add('animate-spin');
    } else if (order.status === 'ready') {
      stepCookingIcon.classList.remove('animate-spin');
      stepCookingIcon.textContent = "✓";
      stepCookingIcon.classList.replace('bg-brand-500', 'bg-emerald-500');
      stepReadyContainer.classList.remove('opacity-40');
      stepReadyContainer.querySelector('.w-6').classList.replace('bg-slate-300', 'bg-brand-500');
      stepReadyContainer.querySelector('.w-6').classList.add('animate-bounce');
    } else if (order.status === 'served') {
      stepReadyContainer.classList.remove('opacity-40');
      stepReadyContainer.querySelector('.w-6').classList.replace('bg-brand-500', 'bg-emerald-500');
      stepReadyContainer.querySelector('.w-6').classList.remove('animate-bounce');
      stepReadyContainer.querySelector('.w-6').textContent = "✓";
    }
  }

  // Initial Load
  fetchMenu();
});
