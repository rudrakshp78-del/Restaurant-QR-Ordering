// Comprehensive Indian Restaurant Menu
const menuItems = [
  // --- STARTERS & TANDOOR ---
  {
    id: "item-101",
    name: "Paneer Tikka (Tandoori)",
    category: "starters",
    categoryLabel: "Starters & Tandoor",
    price: 240,
    isVeg: true,
    isSpicy: false,
    rating: 4.8,
    description: "Cubes of fresh cottage cheese marinated in spiced yogurt and grilled in traditional clay tandoor with onions and capsicum.",
    image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-102",
    name: "Paneer Malai Tikka",
    category: "starters",
    categoryLabel: "Starters & Tandoor",
    price: 260,
    isVeg: true,
    isSpicy: false,
    rating: 4.9,
    description: "Melt-in-mouth soft paneer cubes marinated in rich cashew cream, cardamom, and subtle herbs grilled to perfection.",
    image: "https://images.unsplash.com/photo-1567184109411-b28f2701838b?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-103",
    name: "Crispy Chilli Paneer (Dry)",
    category: "starters",
    categoryLabel: "Starters & Tandoor",
    price: 230,
    isVeg: true,
    isSpicy: true,
    rating: 4.7,
    description: "Crisp golden fried paneer tossed with spring onions, bell peppers, soy sauce and green chillies in Indo-Chinese style.",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-104",
    name: "Hara Bhara Kabab",
    category: "starters",
    categoryLabel: "Starters & Tandoor",
    price: 190,
    isVeg: true,
    isSpicy: false,
    rating: 4.6,
    description: "Wholesome spinach, green pea and potato patties spiced with aromatic garam masala and shallow-fried golden.",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-105",
    name: "Crispy Sweet Corn Salt & Pepper",
    category: "starters",
    categoryLabel: "Starters & Tandoor",
    price: 180,
    isVeg: true,
    isSpicy: false,
    rating: 4.5,
    description: "Batter-fried golden sweet corn kernels tossed with crushed black pepper, fresh coriander, and lemon juice.",
    image: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=500&auto=format&fit=crop&q=80"
  },

  // --- MAIN COURSE: PANEER SPECIALTIES ---
  {
    id: "item-201",
    name: "Paneer Butter Masala",
    category: "paneer",
    categoryLabel: "Paneer Specialties",
    price: 280,
    isVeg: true,
    isSpicy: false,
    rating: 4.9,
    bestseller: true,
    description: "Chef's signature dish: tender cottage cheese chunks simmered in a velvety, buttery tomato and cashew gravy with kasuri methi.",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-202",
    name: "Shahi Paneer",
    category: "paneer",
    categoryLabel: "Paneer Specialties",
    price: 290,
    isVeg: true,
    isSpicy: false,
    rating: 4.8,
    bestseller: true,
    description: "Royal North-Indian recipe with soft paneer cubes cooked in a mildly sweet, rich almond-cashew white cream gravy.",
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-203",
    name: "Kadai Paneer",
    category: "paneer",
    categoryLabel: "Paneer Specialties",
    price: 270,
    isVeg: true,
    isSpicy: true,
    rating: 4.8,
    description: "Cottage cheese cubes stir-fried in a traditional iron wok with fresh bell peppers, onions, and freshly ground kadai spices.",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-204",
    name: "Palak Paneer",
    category: "paneer",
    categoryLabel: "Paneer Specialties",
    price: 260,
    isVeg: true,
    isSpicy: false,
    rating: 4.7,
    description: "Fresh homemade cottage cheese gently cooked in a smooth, vibrant spinach and garlic puree with fresh cream.",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-205",
    name: "Amritsari Paneer Bhurji",
    category: "paneer",
    categoryLabel: "Paneer Specialties",
    price: 270,
    isVeg: true,
    isSpicy: true,
    rating: 4.7,
    description: "Crumbled fresh paneer sautéed with finely chopped onions, tomatoes, ginger, green chillies and fragrant desi ghee.",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80"
  },

  // --- MAIN COURSE: DAL & VEG ---
  {
    id: "item-301",
    name: "Dal Makhani (Slow Cooked)",
    category: "mains",
    categoryLabel: "Curries & Dals",
    price: 230,
    isVeg: true,
    isSpicy: false,
    rating: 4.9,
    bestseller: true,
    description: "Whole black lentils and kidney beans simmered overnight over slow charcoal flame, finished with churned butter and cream.",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-302",
    name: "Yellow Dal Tadka (Desi Ghee)",
    category: "mains",
    categoryLabel: "Curries & Dals",
    price: 190,
    isVeg: true,
    isSpicy: true,
    rating: 4.6,
    description: "Yellow pigeon pea lentils cooked with turmeric and tempered with sizzling desi ghee, cumin seeds, garlic, and dried red chillies.",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-303",
    name: "Mix Vegetable Curry",
    category: "mains",
    categoryLabel: "Curries & Dals",
    price: 210,
    isVeg: true,
    isSpicy: false,
    rating: 4.5,
    description: "Carrots, french beans, green peas, cauliflower, and potatoes tossed in a homestyle onion-tomato gravy.",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80"
  },

  // --- BREADS & CHAPPATI ---
  {
    id: "item-401",
    name: "Tandoori Butter Chapati / Roti",
    category: "breads",
    categoryLabel: "Chappati & Breads",
    price: 30,
    isVeg: true,
    isSpicy: false,
    rating: 4.8,
    bestseller: true,
    description: "Traditional whole-wheat Indian flatbread baked fresh in clay tandoor, brushed with rich creamy butter.",
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-402",
    name: "Tandoori Plain Chapati / Roti",
    category: "breads",
    categoryLabel: "Chappati & Breads",
    price: 25,
    isVeg: true,
    isSpicy: false,
    rating: 4.6,
    description: "Healthy 100% whole wheat flatbread made in hot clay oven without any butter or oil.",
    image: "https://images.unsplash.com/photo-1567184109411-b28f2701838b?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-403",
    name: "Tawa Butter Phulka (2 pcs)",
    category: "breads",
    categoryLabel: "Chappati & Breads",
    price: 45,
    isVeg: true,
    isSpicy: false,
    rating: 4.7,
    description: "Soft puffed home-style wheat chapatis made on traditional tawa and glazed with melted butter.",
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-404",
    name: "Butter Naan",
    category: "breads",
    categoryLabel: "Chappati & Breads",
    price: 55,
    isVeg: true,
    isSpicy: false,
    rating: 4.9,
    bestseller: true,
    description: "Soft and fluffy leavened bread baked in clay tandoor and generously brushed with melted dairy butter.",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-405",
    name: "Garlic Butter Naan",
    category: "breads",
    categoryLabel: "Chappati & Breads",
    price: 70,
    isVeg: true,
    isSpicy: false,
    rating: 4.9,
    bestseller: true,
    description: "Signature tandoori naan encrusted with minced roasted garlic cloves, fresh coriander leaves, and dripping butter.",
    image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-406",
    name: "Lachha Paratha (Multi-layered)",
    category: "breads",
    categoryLabel: "Chappati & Breads",
    price: 60,
    isVeg: true,
    isSpicy: false,
    rating: 4.7,
    description: "Crisp and flaky multi-layered whole wheat bread cooked with ghee in clay oven.",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-407",
    name: "Missi Roti (Gram Flour)",
    category: "breads",
    categoryLabel: "Chappati & Breads",
    price: 50,
    isVeg: true,
    isSpicy: false,
    rating: 4.6,
    description: "Traditional Rajasthani bread made of besan and wheat flour spiced with ajwain, onions, and kasuri methi.",
    image: "https://images.unsplash.com/photo-1567184109411-b28f2701838b?w=500&auto=format&fit=crop&q=80"
  },

  // --- RICE & BIRYANI ---
  {
    id: "item-501",
    name: "Jeera Rice (Ghee Tempered)",
    category: "rice",
    categoryLabel: "Rice & Biryani",
    price: 160,
    isVeg: true,
    isSpicy: false,
    rating: 4.6,
    description: "Aromatic extra long grain basmati rice tempered with royal cumin seeds and pure desi ghee.",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-502",
    name: "Paneer Tikka Biryani (with Raita)",
    category: "rice",
    categoryLabel: "Rice & Biryani",
    price: 290,
    isVeg: true,
    isSpicy: true,
    rating: 4.8,
    bestseller: true,
    description: "Dum cooked royal basmati rice layered with smoky tandoori paneer tikka, saffron, caramelized onions, and mint. Served with boondi raita.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80"
  },

  // --- BEVERAGES & DESSERTS ---
  {
    id: "item-601",
    name: "Special Punjabi Sweet Lassi",
    category: "drinks",
    categoryLabel: "Beverages & Desserts",
    price: 80,
    isVeg: true,
    isSpicy: false,
    rating: 4.9,
    description: "Traditional thick churned sweet yogurt served chilled in an earthen kulhad topped with rich clotted cream and pistachios.",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-602",
    name: "Fresh Lime Soda (Sweet & Salt)",
    category: "drinks",
    categoryLabel: "Beverages & Desserts",
    price: 60,
    isVeg: true,
    isSpicy: false,
    rating: 4.7,
    description: "Refreshing fizzy soda infused with freshly squeezed lemons, mint leaves, rock salt and sugar syrup.",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "item-603",
    name: "Gulab Jamun with Rabri (2 pcs)",
    category: "drinks",
    categoryLabel: "Beverages & Desserts",
    price: 110,
    isVeg: true,
    isSpicy: false,
    rating: 4.9,
    bestseller: true,
    description: "Warm, melt-in-mouth golden khoya dumplings served immersed in aromatic saffron syrup and creamy chilled rabri.",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80"
  }
];

module.exports = { menuItems };
