# 🍽️ Gajanan Hotel - Direct Table QR Code Ordering & Kitchen Display System

A modern, real-time Food Ordering & Kitchen Management System built specifically for **Gajanan Hotel**. Customers scan the QR Code on their table using **Google Lens** or any smartphone camera, browse the menu (Paneer Butter Masala, Shahi Paneer, Tandoori Chapatis, Naan, Biryani, Lassi, etc.), and place orders directly to the kitchen chef with a **strict 30-second cancellation window**.

---

## 🌟 Key Highlights & Why Order Directly via Website

1. ⚡ **Zero Wait Time & No Delay**
   - No waiting for a busy waiter to arrive, bring a paper menu, or write down orders.
   - Orders transmit instantly from the table straight to the kitchen chef's display.

2. ⏱️ **30-Second Risk-Free Cancellation Window**
   - Changed your mind or selected the wrong dish? You have an animated **30-second countdown clock** on your screen.
   - Cancel with one tap within 30 seconds.
   - After 30 seconds, the order automatically locks into active cooking to prevent food waste.

3. 🧀 **Gajanan Hotel Specialties (100% Pure Veg & Fresh)**
   - Freshly made on order: **Paneer Butter Masala, Shahi Paneer, Kadai Paneer, Paneer Tikka, Tandoori Butter Chapati, Garlic Naan, Dal Makhani, Dum Biryani, Kulhad Lassi**.
   - Custom notes for chef: guests can specify *"Make chapatis soft & buttery"*, *"paneer medium spicy"*, etc.

4. 📱 **Live Order Tracking on Your Phone**
   - Real-time updates without refreshing: [Order Received] → [Chef Preparing in Kitchen] → [Ready for Table] → [Served].

5. 📷 **Google Lens & Camera QR Scanning**
   - Each table (Table 1 to 12) has a high-resolution standee card generated dynamically at `/qrcodes`.
   - Point any camera to open the menu for that specific table directly on local Wi-Fi.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)

### Installation & Running
```bash
# Navigate to project folder
cd "c:\Users\Rudraksh paliwal\Downloads\Restaurent"

# Install dependencies
npm install

# Start the server
npm start
```

---

## 🌐 Application URLs

| Portal | URL | Description |
|---|---|---|
| **Customer Food Menu** | `http://localhost:3000/?table=1` | Table 1 dining menu & food ordering |
| **Gajanan Kitchen Display (KDS)** | `http://localhost:3000/kitchen` | Live kitchen tickets with audio bells for cooking staff |
| **Print Table QR Standees** | `http://localhost:3000/qrcodes` | High-res printable QR cards for Google Lens |
| **Manager & Billing** | `http://localhost:3000/admin` | Live table occupancy & billing settlement |

> 📱 **Mobile Phone Access**: Connect your phone to the same Wi-Fi network and open:  
> `http://10.190.32.46:3000/?table=1`
