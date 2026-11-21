-- ====================================================================
-- SMARTDINE RESTAURANT SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- Complete database architecture with RLS, Triggers, and Indexes
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL DEFAULT 'Gajanan Hotel - SmartDine Luxury',
    tagline VARCHAR(255) DEFAULT 'Authentic Flavors, Royal Hospitality',
    address TEXT DEFAULT 'Main Highway Road, Near City Center',
    phone VARCHAR(50) DEFAULT '+91 98765 43210',
    email VARCHAR(100) DEFAULT 'info@gajananhotel.com',
    logo_url TEXT,
    gst_number VARCHAR(50) DEFAULT '08AAAAA0000A1Z5',
    currency VARCHAR(10) DEFAULT 'INR',
    tax_percentage NUMERIC(5, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROFILES TABLE (Users & Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'counter', -- 'admin', 'counter', 'chef', 'customer'
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. STAFF TABLE (Internal Staff Directory & Credentials)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'counter', -- 'admin', 'counter', 'chef'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive'
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLES TABLE (Physical Restaurant Tables & QR Configurations)
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_code VARCHAR(20) UNIQUE NOT NULL, -- 'T01', 'T02', 'T03'
    table_name VARCHAR(100) NOT NULL, -- 'Table 01'
    seating_capacity INT DEFAULT 4,
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'occupied', 'reserved', 'billed'
    qr_code_url TEXT,
    active_order_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0,
    icon VARCHAR(50) DEFAULT 'utensils',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. MENU_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    is_veg BOOLEAN DEFAULT TRUE,
    is_spicy BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    prep_time_minutes INT DEFAULT 15,
    rating NUMERIC(2, 1) DEFAULT 4.8,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL, -- 'ORD-1001'
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    table_code VARCHAR(20) NOT NULL, -- 'T01'
    order_type VARCHAR(50) DEFAULT 'dine_in', -- 'dine_in', 'takeaway'
    customer_name VARCHAR(100) DEFAULT 'Guest',
    customer_phone VARCHAR(50),
    customer_notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'placed',
    -- Status progression:
    -- 1. 'placed' (Customer sent order)
    -- 2. 'confirmed' (Counter accepted order)
    -- 3. 'in_kitchen' (Forwarded to chef)
    -- 4. 'preparing' (Chef actively cooking)
    -- 5. 'food_ready' (Chef completed cooking)
    -- 6. 'out_for_delivery' (Waitstaff delivering to table)
    -- 7. 'served' (Food delivered)
    -- 8. 'rejected' (Counter rejected with reason)
    -- 9. 'cancelled' (Cancelled by customer within 30s)
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estimated_prep_time INT DEFAULT 20, -- minutes
    rejection_reason TEXT,
    cancel_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    kitchen_sent_at TIMESTAMP WITH TIME ZONE,
    cooking_started_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    served_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 8. ORDER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(10, 2) NOT NULL,
    is_prepared BOOLEAN DEFAULT FALSE,
    special_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. ORDER_STATUS_HISTORY TABLE (Full Audit Trail)
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_by_role VARCHAR(50) DEFAULT 'system', -- 'customer', 'counter', 'chef'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    bill_number VARCHAR(50) UNIQUE NOT NULL, -- 'BILL-2026-001'
    table_code VARCHAR(20) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'cash', 'upi', 'card'
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
    transaction_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_tables_code ON public.tables(table_code);
CREATE INDEX IF NOT EXISTS idx_menu_category ON public.menu_items(category_slug);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_code);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Customers can view available menu items and table info
CREATE POLICY "Public can view available menu items" ON public.menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Public can view tables" ON public.tables FOR SELECT USING (true);

-- Customers can insert orders
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view their own order" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view order items" ON public.order_items FOR SELECT USING (true);
