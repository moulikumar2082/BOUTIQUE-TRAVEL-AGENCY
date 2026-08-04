# 🏰 BOUTIQUE TRAVEL AGENCY | Royal Trails India

An interactive, high-performance web platform for **Boutique Travel Agency (Royal Trails India)** showcasing luxury domestic travel experiences, heritage stays, and bespoke itineraries across India.

![Boutique Travel Agency](images/rajasthan_real.jpg)

---

## 🌟 Key Features

- **🏰 Curated Tour Packages**: Premium packages covering Kashmir, Kerala, Goa, Rajasthan, Ladakh, and Andaman Islands with real-time budget estimates.
- **🗺️ Regional Explorer**: Filter destinations across North India, South India, West India, East India, and Islands.
- **📱 OTP Mobile Login & Password Auth**: Instant 6-digit OTP phone authentication, registration, and login system.
- **💾 SQLite Permanent Data Storage**: All user profiles, saved wishlists (❤️), and tour bookings are persisted on disk (`database.db`) and synced with `localStorage`.
- **🤖 AI Trip Planner**: Interactive wizard generating custom day-by-day itineraries tailored to destination, duration, and travel style.
- **🧮 Indian Travel Budget Calculator**: Instant per-person expenditure breakdown for stays, transport, and food.
- **📄 Downloadable PDF Itineraries**: Digital itinerary generator for travelers.
- **📸 High-Res Real Photography**: Authentic photography capturing iconic Indian destinations.

---

## 🛠️ Project Structure & Sitemap

```
BOUTIQUE-TRAVEL-AGENCY/
├── index.html        # Main SPA UI structure & modals
├── styles.css        # Luxury dark design system & animations
├── script.js        # Interactive frontend logic & API client
├── server.py        # Python SQLite API & Web Server (Port 8000)
├── database.db      # SQLite persistent storage (Git ignored)
├── images/          # Real destination photography
└── README.md        # Documentation
```

### Pages & Sections
1. **Home & Hero Section**: Brand showcase, search widget, and popular packages.
2. **Popular Packages**: Kashmir, Kerala, Goa, Rajasthan, Ladakh, Andaman.
3. **Regional Destinations**: North, South, West, East India & Islands.
4. **Services**: Hotels, Air Charters, Vistadome Trains, Cabs, Safari, Local Guides.
5. **AI Planner & Tools**: AI Itinerary Generator & Budget Calculator.
6. **Why Us & Stats**: Company pillars, 15,000+ satisfied travelers, 99.8% satisfaction.
7. **Travel Guides & Blog**: Destination tips, packing lists, food guides.
8. **Auth & User Dashboard**: OTP verification, Wishlist manager, Active bookings history.

---

## 🚀 How to Run Locally

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/moulikumar2082/BOUTIQUE-TRAVEL-AGENCY.git
   cd BOUTIQUE-TRAVEL-AGENCY
   ```

2. **Start the Persistent Server**:
   ```bash
   python3 server.py
   ```

3. **Open in Browser**:
   Navigate to `http://localhost:8000` in your web browser.

---

## 🔒 License & Copyright

© 2024 BOUTIQUE TRAVEL AGENCY. All rights reserved.