# 🍽️ Royal Spice - Restaurant QR Code Table Ordering & Kitchen Display System

A modern, real-time Restaurant QR Code Ordering and Kitchen Management System. Customers scan the QR Code on their table using **Google Lens** or any phone camera, browse the menu (Paneer Butter Masala, Tandoori Chapatis, Naans, Biryani, etc.), place orders directly into the kitchen, and have a **strict 30-second cancellation window** before the order locks into cooking.

---

## 🌟 Key Highlights

### 1. 📷 Every Table Barcode / QR Code (Google Lens Compatible)
- Each restaurant table (Table 1 to 12+) has a unique QR Code barcode.
- Scanning via **Google Lens** or smartphone camera instantly opens the menu for that specific table (e.g., `http://<IP>:3000/?table=3`).
- Automatic detection of local Wi-Fi IP (e.g. `10.190.32.46`), allowing all phones connected to the restaurant Wi-Fi to scan and order seamlessly.
- Printable high-resolution **Table Standees / Acrylic Tent Cards** ready to print in one click (`/qrcodes`).

### 2. 🍲 Direct Table Ordering Menu
- Categorized menu with photos, descriptions, veg badges, bestseller tags, and prices:
  - **Paneer Specialties**: Paneer Butter Masala, Shahi Paneer, Kadai Paneer, Palak Paneer, Amritsari Paneer Bhurji.
  - **Chappati & Breads**: Tandoori Butter Chapati, Plain Roti, Tawa Butter Phulka, Butter Naan, Garlic Naan, Lachha Paratha, Missi Roti.
  - **Starters & Tandoor**: Paneer Tikka, Paneer Malai Tikka, Crispy Chilli Paneer, Hara Bhara Kabab.
  - **Curries, Rice & Drinks**: Dal Makhani, Dal Tadka, Paneer Tikka Biryani, Sweet Punjabi Lassi, Fresh Lime Soda, Gulab Jamun with Rabri.
- Special cooking instructions note for the chef (e.g. *"Make chapatis crisp & hot, medium spicy paneer"*).

### 3. ⏱️ Strict 30-Second Cancellation Window
- Once the order is placed, an animated circular countdown clock counts down from **30 seconds to 0 seconds**.
- **Within 30 seconds**:
  - Customer can click the pulsing **"Cancel Order"** button.
  - The kitchen is instantly alerted that the order was voided, avoiding food waste.
- **After 30 seconds**:
  - The cancellation window locks permanently.
  - The Cancel button disables and transforms into *"Chef Preparing Order 👨‍🍳"*.
  - Enforced on both **Frontend UI** and **Backend Server API** (server strictly rejects any cancellation after 30,000 ms).

### 4. 👨‍🍳 Kitchen Display System (KDS) for Cooking Person
- Real-time kitchen view (`/kitchen`) designed for touch screens and kitchen tablets.
- **Pleasant Web Audio Chime / Bell** when an order arrives and when cooking starts.
- Order columns:
  - ⏳ **Grace Period (30s)**: Incoming orders with live countdown.
  - 📋 **In Queue / Confirmed**: Locked orders ready to cook.
  - 🔥 **Cooking in Progress**: Chef clicked *"Start Cooking Now"*.
  - ✅ **Ready for Table**: Plated food ready for waitstaff.
- Full guest special instructions highlighted in yellow.

### 5. 💼 Manager & Billing Dashboard
- Real-time table occupancy matrix (`/admin`).
- Active table bills, total daily sales revenue.
- *"Settle & Clear"* button to vacate tables after dining.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)

### Installation
```bash
# Navigate to project folder
cd "c:\Users\Rudraksh paliwal\Downloads\Restaurent"

# Install dependencies
npm install

# Start the server
npm start
```

---

## 🌐 Application Links

| Portal | URL | Purpose |
|---|---|---|
| **Customer Menu** | `http://localhost:3000/?table=1` | Table 1 dining menu & ordering |
| **Kitchen Display (KDS)** | `http://localhost:3000/kitchen` | For the cooking chef & kitchen staff |
| **Print QR Standees** | `http://localhost:3000/qrcodes` | Printable table cards for Google Lens |
| **Manager & Billing** | `http://localhost:3000/admin` | Table occupancy & cashier settlement |

> 📱 **Phone Wi-Fi Access**: On mobile phones connected to the restaurant Wi-Fi, open:  
> `http://10.190.32.46:3000/?table=X`
