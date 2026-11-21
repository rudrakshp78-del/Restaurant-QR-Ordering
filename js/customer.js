// SMARTDINE - Customer Ordering & Table Management
document.addEventListener('DOMContentLoaded', () => {
  const refreshIcons = () => {
    if (window.lucide) window.lucide.createIcons();
  };

  // State
  let menu = [];
  let cart = []; // Array of { id, name, price, quantity, prepTime, image }
  let currentCategory = 'all';
  let searchQuery = '';
  let orderType = 'dine_in';
  let currentTable = 'T01';

  // Read URL query parameter: /menu?table=T01 or /?table=T01
  const urlParams = new URLSearchParams(window.location.search);
  const paramTable = urlParams.get('table');
  if (paramTable) {
    currentTable = paramTable.toUpperCase().trim();
  }

  // Socket.io Safe Connection
  let socket = null;
  try {
    if (typeof io !== 'undefined') {
      socket = io();
      socket.on('connect', () => {
        socket.emit('table:join', currentTable);
      });
      socket.on('menu:updated', () => fetchMenu());
    }
  } catch (e) {
    console.warn("Socket.io standalone fallback:", e);
  }

  // DOM Elements
  const headerTableIndicator = document.getElementById('headerTableIndicator');
  const heroTableCode = document.getElementById('heroTableCode');
  const changeTableBtn = document.getElementById('changeTableBtn');
  const heroSwitchBtn = document.getElementById('heroSwitchBtn');
  const tablePickerModal = document.getElementById('tablePickerModal');
  const closeTablePickerBtn = document.getElementById('closeTablePickerBtn');
  const tableOptionsGrid = document.getElementById('tableOptionsGrid');

  const dishesGrid = document.getElementById('dishesGrid');
  const noResultsState = document.getElementById('noResultsState');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const catPills = document.querySelectorAll('.cat-pill');
  const menuSectionTitle = document.getElementById('menuSectionTitle');

  const openCartBtn = document.getElementById('openCartBtn');
  const cartCountBadge = document.getElementById('cartCountBadge');
  const floatingCartBar = document.getElementById('floatingCartBar');
  const floatingCartCount = document.getElementById('floatingCartCount');
  const floatingCartTotal = document.getElementById('floatingCartTotal');
  const viewCartTriggerBtn = document.getElementById('viewCartTriggerBtn');

  const cartModal = document.getElementById('cartModal');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartTableBadge = document.getElementById('cartTableBadge');
  const cartItemsList = document.getElementById('cartItemsList');
  const chefNotesInput = document.getElementById('chefNotesInput');
  const cartSubtotalText = document.getElementById('cartSubtotalText');
  const cartTaxText = document.getElementById('cartTaxText');
  const cartGrandTotalText = document.getElementById('cartGrandTotalText');
  const confirmOrderBtn = document.getElementById('confirmOrderBtn');

  const typeDineInBtn = document.getElementById('typeDineInBtn');
  const typeTakeawayBtn = document.getElementById('typeTakeawayBtn');

  // Set Table Function
  function setTable(code) {
    currentTable = code.toUpperCase().trim();
    if (headerTableIndicator) {
      headerTableIndicator.innerHTML = `<i data-lucide="map-pin" class="w-3 h-3 mr-1 inline"></i> ${currentTable}`;
    }
    if (heroTableCode) heroTableCode.textContent = currentTable;
    if (cartTableBadge) cartTableBadge.textContent = `Ordering for ${currentTable} • Gajanan Hotel`;

    const newUrl = `${window.location.pathname}?table=${currentTable}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    if (socket && socket.connected) {
      socket.emit('table:join', currentTable);
    }
    refreshIcons();
  }

  setTable(currentTable);

  // Table Picker Populate & Toggle
  function populateTablePicker() {
    const tables = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10', 'T11', 'T12'];
    tableOptionsGrid.innerHTML = tables.map(t => `
      <button class="table-choice-btn p-2.5 rounded-xl border border-cream-200 hover:border-gold-500 hover:bg-gold-50 font-bold text-xs text-charcoal-900 transition ${t === currentTable ? 'bg-charcoal-900 text-gold-400 border-gold-500' : ''}" data-code="${t}">
        ${t}
      </button>
    `).join('');

    document.querySelectorAll('.table-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setTable(btn.dataset.code);
        tablePickerModal.classList.add('hidden');
      });
    });
  }

  populateTablePicker();

  if (changeTableBtn) changeTableBtn.addEventListener('click', () => tablePickerModal.classList.remove('hidden'));
  if (heroSwitchBtn) heroSwitchBtn.addEventListener('click', () => tablePickerModal.classList.remove('hidden'));
  if (closeTablePickerBtn) closeTablePickerBtn.addEventListener('click', () => tablePickerModal.classList.add('hidden'));

  // Dine-In vs Takeaway Toggles
  typeDineInBtn.addEventListener('click', () => {
    orderType = 'dine_in';
    typeDineInBtn.className = "flex-1 py-1.5 rounded-lg bg-charcoal-900 text-gold-400 shadow-sm transition";
    typeTakeawayBtn.className = "flex-1 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 transition";
    cartTableBadge.textContent = `Ordering for ${currentTable} • Dine-In`;
  });

  typeTakeawayBtn.addEventListener('click', () => {
    orderType = 'takeaway';
    typeTakeawayBtn.className = "flex-1 py-1.5 rounded-lg bg-charcoal-900 text-gold-400 shadow-sm transition";
    typeDineInBtn.className = "flex-1 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 transition";
    cartTableBadge.textContent = `Ordering for Takeaway / Parcel`;
  });

  // Instant render from embedded data if available (zero blank flicker)
  if (window.GAJANAN_MENU && (!menu || menu.length === 0)) {
    menu = window.GAJANAN_MENU;
  }

  // Fetch Menu from server with local fallback
  async function fetchMenu() {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const liveMenu = await res.json();
        if (Array.isArray(liveMenu) && liveMenu.length > 0) {
          menu = liveMenu;
        }
      } else if (window.GAJANAN_MENU && (!menu || menu.length === 0)) {
        menu = window.GAJANAN_MENU;
      }
    } catch (e) {
      console.warn("Using embedded fallback menu", e);
      if (window.GAJANAN_MENU && (!menu || menu.length === 0)) menu = window.GAJANAN_MENU;
    }
    renderDishes();
  }

  // Render Dishes Cards
  function renderDishes() {
    let list = menu;

    if (currentCategory !== 'all') {
      list = list.filter(item => item.categorySlug === currentCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      dishesGrid.innerHTML = '';
      noResultsState.classList.remove('hidden');
      return;
    }

    noResultsState.classList.add('hidden');

    dishesGrid.innerHTML = list.map(dish => {
      const cartItem = cart.find(c => c.id === dish.id);
      const qty = cartItem ? cartItem.quantity : 0;
      const isAvailable = dish.isAvailable !== false;

      return `
        <div class="bg-white rounded-3xl p-4 border border-cream-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between ${!isAvailable ? 'opacity-60 grayscale-[40%]' : ''}">
          <div class="flex space-x-3.5">
            
            <!-- Food Image -->
            <div class="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-cream-200/50">
              <img 
                src="${dish.image}" 
                alt="${dish.name}" 
                class="w-full h-full object-cover transition duration-300 hover:scale-105"
                loading="lazy"
                onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'"
              />
              ${dish.isBestseller ? `
                <span class="absolute top-1.5 left-1.5 bg-gradient-to-r from-gold-600 to-amber-500 text-charcoal-900 text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                  ★ BESTSELLER
                </span>
              ` : ''}
              ${!isAvailable ? `
                <div class="absolute inset-0 bg-black/60 flex items-center justify-center p-1 text-center">
                  <span class="text-white text-[10px] font-extrabold uppercase bg-red-600 px-2 py-0.5 rounded">Sold Out</span>
                </div>
              ` : ''}
            </div>

            <!-- Details -->
            <div class="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div class="flex items-center space-x-1.5">
                  <span class="inline-flex w-3 h-3 rounded-sm border border-emerald-600 p-[1px] items-center justify-center">
                    <span class="block w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  </span>
                  <span class="text-[10px] uppercase font-bold text-stone-400 tracking-wider">${dish.categoryName || 'Special'}</span>
                  <span class="text-[10px] text-stone-400">• ${dish.prepTime || 15} mins</span>
                </div>

                <h4 class="font-serif-luxury font-bold text-charcoal-900 text-sm sm:text-base leading-snug truncate mt-1">
                  ${dish.name}
                </h4>
                <p class="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                  ${dish.description}
                </p>
              </div>

              <!-- Price & Rating -->
              <div class="flex items-baseline justify-between mt-2">
                <span class="text-base font-black text-charcoal-900 font-serif-luxury">₹${dish.price}</span>
                <span class="text-[11px] font-bold text-amber-600 flex items-center">
                  ★ ${dish.rating || 4.8}
                </span>
              </div>
            </div>

          </div>

          <!-- Bottom Action -->
          <div class="mt-3 pt-2.5 border-t border-cream-100 flex items-center justify-between">
            <span class="text-[10px] text-stone-400">Gajanan Kitchen Fresh</span>

            ${!isAvailable ? `
              <span class="text-xs font-bold text-stone-400">Unavailable</span>
            ` : (qty > 0 ? `
              <div class="flex items-center space-x-2 bg-gold-50 border border-gold-300/80 rounded-xl px-2 py-1">
                <button onclick="window.modifyQty('${dish.id}', -1)" class="w-6 h-6 rounded-lg bg-white text-charcoal-900 font-extrabold shadow-sm hover:bg-gold-100 flex items-center justify-center text-xs">-</button>
                <span class="font-black text-charcoal-900 text-xs px-1.5">${qty}</span>
                <button onclick="window.modifyQty('${dish.id}', 1)" class="w-6 h-6 rounded-lg gold-gradient-bg text-charcoal-900 font-extrabold shadow-sm hover:brightness-105 flex items-center justify-center text-xs">+</button>
              </div>
            ` : `
              <button onclick="window.addToCart('${dish.id}')" class="px-4 py-1.5 rounded-xl gold-gradient-bg hover:brightness-110 active:scale-95 text-charcoal-900 font-extrabold text-xs shadow-sm transition flex items-center space-x-1">
                <span>+ ADD</span>
              </button>
            `)}
          </div>
        </div>
      `;
    }).join('');

    refreshIcons();
  }

  // Cart Functions
  window.addToCart = (id) => {
    const item = menu.find(m => m.id === id);
    if (!item || item.isAvailable === false) return;

    const existing = cart.find(c => c.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        prepTime: item.prepTime || 15,
        quantity: 1
      });
    }

    if (window.restaurantAudio) window.restaurantAudio.playOrderBell();
    updateCartUI();
    renderDishes();
  };

  window.modifyQty = (id, delta) => {
    const idx = cart.findIndex(c => c.id === id);
    if (idx === -1) return;

    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) {
      cart.splice(idx, 1);
    }

    updateCartUI();
    renderDishes();
  };

  function updateCartUI() {
    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const tax = Math.round(subtotal * 0.05); // 5% GST
    const grandTotal = subtotal + tax;

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

    cartSubtotalText.textContent = `₹${subtotal}`;
    cartTaxText.textContent = `₹${tax}`;
    cartGrandTotalText.textContent = `₹${grandTotal}`;

    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="text-center py-12 text-stone-400">
          <i data-lucide="shopping-bag" class="w-12 h-12 mx-auto mb-2 text-stone-300"></i>
          <p class="font-bold text-sm">Your cart is empty</p>
          <p class="text-xs">Add delicious dishes from the menu to place your table order</p>
        </div>
      `;
    } else {
      cartItemsList.innerHTML = cart.map(item => `
        <div class="flex items-center justify-between bg-cream-50 p-3 rounded-2xl border border-cream-200">
          <div class="flex items-center space-x-3">
            <img src="${item.image}" class="w-12 h-12 rounded-xl object-cover" onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'">
            <div>
              <h5 class="text-xs font-bold text-charcoal-900">${item.name}</h5>
              <div class="text-[11px] text-stone-500">₹${item.price} each</div>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="window.modifyQty('${item.id}', -1)" class="w-6 h-6 rounded-lg bg-white border border-cream-200 font-extrabold flex items-center justify-center text-xs text-stone-700">-</button>
            <span class="text-xs font-black text-charcoal-900 px-1">${item.quantity}</span>
            <button onclick="window.modifyQty('${item.id}', 1)" class="w-6 h-6 rounded-lg gold-gradient-bg text-charcoal-900 font-extrabold flex items-center justify-center text-xs">+</button>
            <span class="text-xs font-black text-charcoal-900 ml-2 w-12 text-right">₹${item.price * item.quantity}</span>
          </div>
        </div>
      `).join('');
    }

    refreshIcons();
  }

  // Open & Close Cart
  const openCart = () => { if (cart.length > 0) cartModal.classList.remove('hidden'); };
  const closeCart = () => cartModal.classList.add('hidden');

  openCartBtn.addEventListener('click', openCart);
  viewCartTriggerBtn.addEventListener('click', openCart);
  closeCartBtn.addEventListener('click', closeCart);

  // Search & Category Filters
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.classList.toggle('hidden', !searchQuery);
    renderDishes();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderDishes();
  });

  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => {
        p.classList.remove('active', 'bg-charcoal-900', 'text-gold-400', 'border-gold-500/30');
        p.classList.add('bg-white', 'text-stone-700', 'border-cream-200');
      });

      pill.classList.add('active', 'bg-charcoal-900', 'text-gold-400', 'border-gold-500/30');
      pill.classList.remove('bg-white', 'text-stone-700', 'border-cream-200');

      currentCategory = pill.dataset.cat;
      menuSectionTitle.textContent = currentCategory === 'all' ? "Today's Food Menu" : pill.textContent.trim();
      renderDishes();
    });
  });

  // ==================== PLACE ORDER ====================
  confirmOrderBtn.addEventListener('click', async () => {
    if (cart.length === 0) return;

    confirmOrderBtn.disabled = true;
    confirmOrderBtn.innerHTML = `<span>Placing Order...</span>`;

    const payload = {
      tableCode: currentTable,
      orderType,
      items: cart,
      customerNotes: chefNotesInput.value.trim(),
      customerName: `${currentTable} Guest`
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to place order.");
        confirmOrderBtn.disabled = false;
        confirmOrderBtn.innerHTML = `<span>Confirm & Send to Kitchen</span> <i data-lucide="send" class="w-4 h-4"></i>`;
        return;
      }

      // Order created! Redirect to live order tracking screen
      const orderId = data.order.id;
      cart = [];
      updateCartUI();
      closeCart();

      window.location.href = `/track?orderId=${orderId}&table=${currentTable}`;

    } catch (err) {
      console.error(err);
      alert("Network error. Please try placing order again.");
      confirmOrderBtn.disabled = false;
      confirmOrderBtn.innerHTML = `<span>Confirm & Send to Kitchen</span> <i data-lucide="send" class="w-4 h-4"></i>`;
    }
  });

  // Initial Load
  fetchMenu();
});
