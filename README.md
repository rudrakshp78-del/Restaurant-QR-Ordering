# 🍽️ SMARTDINE – Complete Smart Restaurant QR Ordering and Management System
**Featuring Gajanan Hotel (Royal Indian Cuisine & Luxury Dining)**

A production-grade, real-time restaurant ordering, kitchen display, counter dispatch, and restaurant management system. Customers scan a unique QR code on their table with **Google Lens** or any mobile camera, browse dishes, customize items, and place orders directly. Counter staff review and route tickets, chefs prepare food with an interactive touchscreen KDS, and customers track their food's preparation in real time on their phone.

---

## 🌟 Complete System Workflow (The 7-Step Real-Time Pipeline)

```
[1. QR Code Scan] ➔ Customer scans /menu?table=T01 via Google Lens
       ▼
[2. Table Order]  ➔ Customer adds Paneer Butter Masala, Chapatis & places order
       ▼
[3. Main Counter] ➔ Order appears instantly on Reception Counter with audio chime
       ▼
[4. Forward KDS]  ➔ Counter accepts and forwards order ticket to the Kitchen
       ▼
[5. Chef Prepares]➔ Chef starts cooking & checks off prepared dishes on touchscreen KDS
       ▼
[6. Food Ready]   ➔ Chef marks order ready; counter and customer notified in real time
       ▼
[7. Dispatch & Bill]➔ Waitstaff serves Table T01; counter records Cash/UPI/Card payment & prints receipt
```

---

## 🎨 Luxury Restaurant Design
- **Color Palette**: Warm Brown (`#2e1c11`), Cream (`#faf7f2`), Dark Charcoal (`#141210`), and Lustrous Gold (`#c89b3c`, `#e5c158`).
- **Typography**: `Playfair Display` (serif elegance), `Cinzel` (regal display), and `Plus Jakarta Sans` (clean UI).
- **Atmosphere**: Full-screen luxury Indian restaurant interior background with warm ambient lighting and soft overlay.

---

## 📋 Food Categories (10 Full Categories with Unique Photography)

1. **Paneer Specials**: Paneer Butter Masala, Shahi Paneer, Kadai Paneer, Palak Paneer, Paneer Tikka Masala.
2. **Indian Bread**: Plain Chapati, Butter Chapati, Tandoori Roti, Butter Naan, Garlic Butter Naan, Lachha Paratha.
3. **Main Course**: Mix Veg Curry, Kaju Curry (Cashew), Dum Aloo Kashmiri, Mushroom Masala.
4. **Dal**: Yellow Dal Tadka (Desi Ghee), Dal Makhani (Overnight Charcoal), Dal Fry (Homestyle).
5. **Rice & Biryani**: Jeera Rice, Steamed Basmati Rice, Veg Dum Biryani, Paneer Tikka Biryani.
6. **Chinese**: Veg Manchurian Dry, Chilli Paneer Gravy, Veg Hakka Noodles, Schezwan Fried Rice.
7. **Starters**: Hara Bhara Kabab, Crispy Corn Salt & Pepper, Veg Spring Rolls.
8. **Beverages**: Special Punjabi Sweet Lassi, Fresh Lime Soda, Cold Coffee with Ice Cream, Masala Chaas.
9. **Desserts**: Gulab Jamun with Rabri, Rasmalai.
10. **Special Thali**: Royal Gajanan Maharaja Thali, Deluxe Executive Thali.

---

## 📱 Portals & Live URLs

| Portal | URL | Purpose |
|---|---|---|
| **Customer Menu** | `http://localhost:3000/menu?table=T01` | Mobile-first table ordering & Google Lens destination |
| **Live Order Tracker** | `http://localhost:3000/track?orderId=ORD-1001` | 7-step real-time progress tracker on customer phone |
| **Main Counter Desk** | `http://localhost:3000/counter` | Reception dashboard to accept, reject & route orders |
| **Chef Kitchen (KDS)** | `http://localhost:3000/kitchen` | Touchscreen kitchen ticket system with audio bells |
| **Owner / Admin Panel** | `http://localhost:3000/admin` | Analytics charts, dish CRUD, table manager & staff |
| **Print Table QR Cards** | `http://localhost:3000/qrcodes` | High-res standees for Table T01 to T12 ready to print |

> 📶 **Mobile Scanning on Local Wi-Fi**:  
> Scan or open: `http://10.190.32.46:3000/menu?table=T01`

---

## 🗄️ Database Architecture (Supabase PostgreSQL & Local Persistence)

The project includes production-ready SQL scripts in `database/supabase_schema.sql` covering:
- `restaurants`
- `profiles`
- `staff`
- `tables`
- `categories`
- `menu_items`
- `orders`
- `order_items`
- `order_status_history`
- `payments`

---

## 🚀 How to Run Locally

```bash
# Clone and navigate
cd "c:\Users\Rudraksh paliwal\Downloads\Restaurent"

# Install dependencies
npm install

# Start the SmartDine real-time server
npm start
```
