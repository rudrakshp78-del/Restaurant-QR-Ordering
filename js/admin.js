// SMARTDINE - Owner & Administrator Operations
document.addEventListener('DOMContentLoaded', () => {
  const refreshIcons = () => {
    if (window.lucide) window.lucide.createIcons();
  };

  let menuItems = [];
  let tables = [];
  let staff = [];
  let analytics = {};

  let revenueChartInstance = null;
  let categoryChartInstance = null;

  // DOM Elements
  const navTabs = document.querySelectorAll('.admin-nav-tab');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');

  const adminFoodTbody = document.getElementById('adminFoodTbody');
  const adminTablesGrid = document.getElementById('adminTablesGrid');
  const adminStaffTbody = document.getElementById('adminStaffTbody');
  const topDishesList = document.getElementById('topDishesList');

  // Modals
  const dishModal = document.getElementById('dishModal');
  const openAddDishModalBtn = document.getElementById('openAddDishModalBtn');
  const closeDishModalBtn = document.getElementById('closeDishModalBtn');
  const cancelDishModalBtn = document.getElementById('cancelDishModalBtn');
  const dishForm = document.getElementById('dishForm');
  const dishModalTitle = document.getElementById('dishModalTitle');
  const dishEditId = document.getElementById('dishEditId');
  const dishNameInput = document.getElementById('dishNameInput');
  const dishCategorySelect = document.getElementById('dishCategorySelect');
  const dishPriceInput = document.getElementById('dishPriceInput');
  const dishPrepTimeInput = document.getElementById('dishPrepTimeInput');
  const dishImageUrlInput = document.getElementById('dishImageUrlInput');
  const dishImageFileInput = document.getElementById('dishImageFileInput');
  const dishDescInput = document.getElementById('dishDescInput');
  const dishIsVegInput = document.getElementById('dishIsVegInput');
  const dishIsBestsellerInput = document.getElementById('dishIsBestsellerInput');

  const tableModal = document.getElementById('tableModal');
  const openAddTableModalBtn = document.getElementById('openAddTableModalBtn');
  const closeTableModalBtn = document.getElementById('closeTableModalBtn');
  const tableForm = document.getElementById('tableForm');
  const tableCodeInput = document.getElementById('tableCodeInput');
  const tableNameInput = document.getElementById('tableNameInput');
  const tableCapacityInput = document.getElementById('tableCapacityInput');

  // Tab Switching
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => {
        t.classList.remove('active', 'bg-charcoal-900', 'text-gold-400');
        t.classList.add('text-stone-600');
      });
      tab.classList.add('active', 'bg-charcoal-900', 'text-gold-400');
      tab.classList.remove('text-stone-600');

      const target = tab.dataset.tab;
      tabPanes.forEach(p => p.classList.add('hidden'));
      document.getElementById(`tab-${target}`).classList.remove('hidden');

      if (target === 'dashboard') loadAnalytics();
      if (target === 'food') loadFoodMenu();
      if (target === 'tables') loadTables();
      if (target === 'staff') loadStaff();
    });
  });

  // ==================== DASHBOARD & CHARTS ====================
  async function loadAnalytics() {
    try {
      const res = await fetch('/api/analytics');
      analytics = await res.json();

      document.getElementById('kpiTodayOrders').textContent = analytics.todayTotalOrders || 0;
      document.getElementById('kpiTodayRevenue').textContent = `₹${(analytics.todayRevenue || 0).toLocaleString()}`;
      document.getElementById('kpiPendingOrders').textContent = analytics.pendingOrders || 0;
      document.getElementById('kpiPreparingOrders').textContent = analytics.preparingOrders || 0;
      document.getElementById('kpiCompletedOrders').textContent = analytics.completedOrders || 0;
      document.getElementById('kpiCancelledOrders').textContent = analytics.cancelledOrders || 0;
      document.getElementById('kpiTotalDishes').textContent = analytics.totalMenuItems || 25;
      document.getElementById('kpiActiveTables').textContent = analytics.activeTables || 0;
      document.getElementById('kpiTableRatio').textContent = `${analytics.activeTables || 0} of ${analytics.totalTables || 12} tables active`;

      // Render Most Ordered Dishes
      if (analytics.mostOrderedDishes && analytics.mostOrderedDishes.length > 0) {
        topDishesList.innerHTML = analytics.mostOrderedDishes.map((dish, i) => `
          <div class="flex items-center justify-between p-3 rounded-2xl bg-cream-50 border border-cream-200">
            <div class="flex items-center space-x-3">
              <span class="w-7 h-7 rounded-lg gold-gradient-bg text-charcoal-900 font-bold flex items-center justify-center text-xs">
                #${i + 1}
              </span>
              <span class="font-serif-luxury font-bold text-sm text-charcoal-900">${dish.name}</span>
            </div>
            <span class="font-extrabold text-xs text-gold-600 bg-gold-50 px-2.5 py-1 rounded-full border border-gold-200">
              ${dish.count} orders
            </span>
          </div>
        `).join('');
      } else {
        topDishesList.innerHTML = `<div class="text-xs text-stone-400 py-3">Dishes will rank here as orders are placed.</div>`;
      }

      renderCharts(analytics);
    } catch (e) {
      console.error(e);
    }
  }

  function renderCharts(data) {
    // 1. Revenue Chart
    const ctxRev = document.getElementById('revenueChart');
    if (ctxRev) {
      if (revenueChartInstance) revenueChartInstance.destroy();

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
      const revenuePoints = [4200, 5800, 5100, 6900, 8400, 11200, data.todayRevenue || 6500];

      revenueChartInstance = new Chart(ctxRev, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{
            label: 'Sales Revenue (₹)',
            data: revenuePoints,
            borderColor: '#c89b3c',
            backgroundColor: 'rgba(200, 155, 60, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: '#f0e8dc' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Category Distribution Chart
    const ctxCat = document.getElementById('categoryChart');
    if (ctxCat) {
      if (categoryChartInstance) categoryChartInstance.destroy();

      const categories = Object.keys(data.categoryDistribution || {});
      const counts = Object.values(data.categoryDistribution || {});

      categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels: categories.length ? categories : ['Paneer', 'Indian Bread', 'Dal', 'Biryani', 'Desserts'],
          datasets: [{
            data: counts.length ? counts : [35, 25, 15, 15, 10],
            backgroundColor: ['#c89b3c', '#e5c158', '#aa8022', '#2e1c11', '#876213', '#d4af37']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  // ==================== FOOD MENU CRUD ====================
  async function loadFoodMenu() {
    try {
      const res = await fetch('/api/menu?all=true');
      menuItems = await res.json();

      adminFoodTbody.innerHTML = menuItems.map(item => `
        <tr class="hover:bg-cream-50/80 transition">
          <td class="p-4 pl-6">
            <div class="flex items-center space-x-3">
              <img src="${item.image}" class="w-10 h-10 rounded-xl object-cover" onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'">
              <div>
                <div class="font-bold text-charcoal-900">${item.name}</div>
                <div class="text-[11px] text-stone-400 line-clamp-1 max-w-xs">${item.description}</div>
              </div>
            </div>
          </td>
          <td class="p-4 font-semibold text-stone-600">${item.categoryName}</td>
          <td class="p-4 font-mono font-bold text-charcoal-900">₹${item.price}</td>
          <td class="p-4 text-stone-500">${item.prepTime || 15}m</td>
          <td class="p-4">
            <button onclick="window.toggleAvailability('${item.id}')" class="px-3 py-1 rounded-full text-[10px] font-bold transition ${item.isAvailable ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}">
              ${item.isAvailable ? '● Available' : '○ Sold Out'}
            </button>
          </td>
          <td class="p-4 pr-6 text-right space-x-1">
            <button onclick="window.editDish('${item.id}')" class="p-1.5 rounded-lg text-stone-600 hover:text-gold-600 hover:bg-cream-200">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="window.deleteDish('${item.id}')" class="p-1.5 rounded-lg text-stone-600 hover:text-red-600 hover:bg-cream-200">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `).join('');

      refreshIcons();
    } catch (e) {
      console.error(e);
    }
  }

  // Toggle Availability
  window.toggleAvailability = async (id) => {
    try {
      const res = await fetch(`/api/menu/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) loadFoodMenu();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Dish
  window.deleteDish = async (id) => {
    if (!confirm("Are you sure you want to delete this dish from the menu?")) return;
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      if (res.ok) loadFoodMenu();
    } catch (e) {
      console.error(e);
    }
  };

  // Open Add Dish Modal
  openAddDishModalBtn.addEventListener('click', () => {
    dishForm.reset();
    dishEditId.value = '';
    dishModalTitle.textContent = "Add New Dish to Menu";
    dishModal.classList.remove('hidden');
  });

  const closeDishModal = () => dishModal.classList.add('hidden');
  closeDishModalBtn.addEventListener('click', closeDishModal);
  cancelDishModalBtn.addEventListener('click', closeDishModal);

  // Edit Dish
  window.editDish = (id) => {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    dishEditId.value = item.id;
    dishNameInput.value = item.name;
    dishCategorySelect.value = item.categorySlug;
    dishPriceInput.value = item.price;
    dishPrepTimeInput.value = item.prepTime || 15;
    dishImageUrlInput.value = item.image;
    dishDescInput.value = item.description;
    dishIsVegInput.checked = item.isVeg;
    dishIsBestsellerInput.checked = !!item.isBestseller;

    dishModalTitle.textContent = "Edit Menu Dish";
    dishModal.classList.remove('hidden');
  };

  // Dish Form Submit
  dishForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let imageUrl = dishImageUrlInput.value.trim();

    // Check if user uploaded a file
    if (dishImageFileInput.files.length > 0) {
      const formData = new FormData();
      formData.append('image', dishImageFileInput.files[0]);
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.imageUrl) imageUrl = uploadData.imageUrl;
      } catch (err) {
        console.warn("Image upload failed, using URL:", err);
      }
    }

    const payload = {
      name: dishNameInput.value.trim(),
      categorySlug: dishCategorySelect.value,
      price: dishPriceInput.value,
      prepTime: dishPrepTimeInput.value,
      image: imageUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
      description: dishDescInput.value.trim(),
      isVeg: dishIsVegInput.checked,
      isBestseller: dishIsBestsellerInput.checked
    };

    const id = dishEditId.value;
    const url = id ? `/api/menu/${id}` : '/api/menu';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        closeDishModal();
        loadFoodMenu();
      }
    } catch (err) {
      console.error(err);
      alert("Error saving dish.");
    }
  });

  // ==================== TABLE MANAGEMENT ====================
  async function loadTables() {
    try {
      const res = await fetch('/api/tables');
      tables = await res.json();

      adminTablesGrid.innerHTML = tables.map(t => {
        const isOccupied = t.status === 'occupied';
        const activeOrdersCount = t.activeOrders ? t.activeOrders.length : 0;

        return `
          <div class="bg-white rounded-3xl p-5 border ${isOccupied ? 'border-amber-400 ring-2 ring-amber-500/10' : 'border-cream-200'} shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-cream-100">
                <span class="text-xl font-black text-charcoal-900 font-serif-luxury">${t.code}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isOccupied ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                  ${isOccupied ? '● Occupied' : '○ Vacant'}
                </span>
              </div>

              <div class="py-3">
                <div class="text-xs font-semibold text-charcoal-900">${t.name}</div>
                <div class="text-[11px] text-stone-500 mt-0.5">Capacity: ${t.capacity} Guests</div>
                <div class="text-[11px] text-gold-600 font-bold mt-1">
                  ${activeOrdersCount} active order ticket(s)
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-cream-100 flex items-center justify-between gap-2">
              <a href="/menu?table=${t.code}" target="_blank" class="flex-1 py-1.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-center font-bold text-xs text-charcoal-900">
                Open Menu
              </a>
              <button onclick="window.downloadTableQR('${t.code}')" class="p-2 rounded-xl gold-gradient-bg text-charcoal-900 hover:brightness-110" title="Download QR Code">
                <i data-lucide="download" class="w-4 h-4"></i>
              </button>
              <button onclick="window.deleteTable('${t.code}')" class="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100" title="Delete Table">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');

      refreshIcons();
    } catch (e) {
      console.error(e);
    }
  }

  // Download QR Code as PNG
  window.downloadTableQR = async (code) => {
    try {
      const res = await fetch(`/api/tables/${code}/qr`);
      const data = await res.json();
      const a = document.createElement('a');
      a.href = data.qrDataUrl;
      a.download = `SmartDine-QR-${code}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  window.deleteTable = async (code) => {
    if (!confirm(`Delete Table ${code}?`)) return;
    try {
      const res = await fetch(`/api/tables/${code}`, { method: 'DELETE' });
      if (res.ok) loadTables();
    } catch (e) {
      console.error(e);
    }
  };

  openAddTableModalBtn.addEventListener('click', () => {
    tableForm.reset();
    tableModal.classList.remove('hidden');
  });

  closeTableModalBtn.addEventListener('click', () => tableModal.classList.add('hidden'));

  tableForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: tableCodeInput.value.trim(),
          name: tableNameInput.value.trim(),
          capacity: tableCapacityInput.value
        })
      });
      if (res.ok) {
        tableModal.classList.add('hidden');
        loadTables();
      }
    } catch (e) {
      console.error(e);
    }
  });

  // ==================== STAFF MANAGEMENT ====================
  async function loadStaff() {
    try {
      const res = await fetch('/api/staff');
      staff = await res.json();

      adminStaffTbody.innerHTML = staff.map(s => `
        <tr class="hover:bg-cream-50 transition">
          <td class="p-4 pl-6 font-bold text-charcoal-900">${s.name}</td>
          <td class="p-4 text-stone-600 font-mono">${s.email}</td>
          <td class="p-4">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${s.role === 'admin' ? 'bg-purple-100 text-purple-800' : (s.role === 'chef' ? 'bg-orange-100 text-orange-800' : 'bg-sky-100 text-sky-800')}">
              ${s.role}
            </span>
          </td>
          <td class="p-4">
            <span class="text-emerald-600 font-bold">Active</span>
          </td>
          <td class="p-4 pr-6 text-right">
            <span class="text-xs text-stone-400">Default Access</span>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  // Initial Load
  loadAnalytics();
});
