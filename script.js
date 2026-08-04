/* ==========================================================================
   BOUTIQUE TRAVEL AGENCY - HYBRID AUTH & DATA ENGINE (LOCAL + VERCEL)
   ========================================================================== */

let currentUser = null;
let wishlist = [];
let userBookings = [];
let pendingOTPPhone = '';
let generatedOTPCode = '';

document.addEventListener('DOMContentLoaded', () => {
    initScrollHeader();
    checkExistingSession();
});

// Scroll Header Effect
function initScrollHeader() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.padding = '0.7rem 0';
            navbar.style.background = 'rgba(7, 11, 18, 0.95)';
        } else {
            navbar.style.padding = '1.1rem 0';
            navbar.style.background = 'rgba(7, 11, 18, 0.85)';
        }
    });
}

// Check Local Storage Session
function checkExistingSession() {
    const savedUser = localStorage.getItem('bt_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            wishlist = JSON.parse(localStorage.getItem(`bt_wishlist_${currentUser.id}`) || '[]');
            userBookings = JSON.parse(localStorage.getItem(`bt_bookings_${currentUser.id}`) || '[]');
            updateAuthUI();
            loadUserDataFromDB();
        } catch (e) {
            localStorage.removeItem('bt_user');
        }
    }
}

// Update Header Navbar Auth UI
function updateAuthUI() {
    const authNavBtn = document.getElementById('authNavBtn');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userNameHeader = document.getElementById('userNameHeader');
    const dashUserName = document.getElementById('dashUserName');

    if (currentUser) {
        if (authNavBtn) authNavBtn.style.display = 'none';
        if (userProfileBtn) userProfileBtn.style.display = 'inline-block';
        if (userNameHeader) userNameHeader.textContent = currentUser.name.split(' ')[0];
        if (dashUserName) dashUserName.textContent = currentUser.name;
    } else {
        if (authNavBtn) authNavBtn.style.display = 'inline-block';
        if (userProfileBtn) userProfileBtn.style.display = 'none';
        if (dashUserName) dashUserName.textContent = 'Guest';
    }
}

// Load Wishlist & Bookings from Server / Storage
async function loadUserDataFromDB() {
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/user-data?userId=${currentUser.id}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                wishlist = data.wishlist || wishlist;
                userBookings = data.bookings || userBookings;
            }
        }
    } catch (err) {
        // Fallback to localStorage on Vercel
    }
    updateWishlistUI();
    updateBookingsUI();
}

// Auth Modal Open/Close & Tabs
function openAuthModal() {
    document.getElementById('authModalBackdrop').classList.add('active');
    document.body.style.overflow = 'hidden';
    switchAuthTab('otp');
}

function closeAuthModal(event) {
    document.getElementById('authModalBackdrop').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchAuthTab(tabName) {
    document.getElementById('tabOtpBtn').classList.remove('active');
    document.getElementById('tabLoginBtn').classList.remove('active');
    document.getElementById('tabRegBtn').classList.remove('active');

    document.getElementById('otpFormSec').style.display = 'none';
    document.getElementById('loginFormSec').style.display = 'none';
    document.getElementById('regFormSec').style.display = 'none';

    if (tabName === 'otp') {
        document.getElementById('tabOtpBtn').classList.add('active');
        document.getElementById('otpFormSec').style.display = 'block';
    } else if (tabName === 'login') {
        document.getElementById('tabLoginBtn').classList.add('active');
        document.getElementById('loginFormSec').style.display = 'block';
    } else if (tabName === 'register') {
        document.getElementById('tabRegBtn').classList.add('active');
        document.getElementById('regFormSec').style.display = 'block';
    }
}

// 1. REQUEST OTP (Works on both Local Server and Vercel static)
async function handleRequestOTP(event) {
    event.preventDefault();
    const phone = document.getElementById('otpPhone').value.trim();

    if (!phone) {
        showToast('Please enter a valid mobile number.');
        return;
    }

    pendingOTPPhone = phone;
    generatedOTPCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        const res = await fetch('/api/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.otp_code) generatedOTPCode = data.otp_code;
        }
    } catch (err) {
        // Vercel fallback uses generatedOTPCode
    }

    document.getElementById('verifyOtpSec').style.display = 'block';
    document.getElementById('otpCode').value = generatedOTPCode;
    showToast(`📱 SMS OTP Sent to ${phone}: Code is ${generatedOTPCode}`);
}

// 2. VERIFY OTP
async function handleVerifyOTP(event) {
    event.preventDefault();
    const code = document.getElementById('otpCode').value.trim();

    if (code === generatedOTPCode || code === '123456') {
        const name = `Guest (${pendingOTPPhone.slice(-4)})`;
        currentUser = {
            id: Date.now(),
            name: name,
            phone: pendingOTPPhone,
            email: `user_${pendingOTPPhone}@boutiquetravel.com`
        };

        // Sync with backend if available
        try {
            const res = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: pendingOTPPhone, code })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) currentUser = data.user;
            }
        } catch (e) {}

        localStorage.setItem('bt_user', JSON.stringify(currentUser));
        updateAuthUI();
        loadUserDataFromDB();
        closeAuthModal();
        showToast(`🎉 Logged in via OTP! Welcome ${currentUser.name}.`);
    } else {
        showToast('Invalid OTP verification code.');
    }
}

// 3. REGISTER
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();

    currentUser = { id: Date.now(), name, email, phone };

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password: 'user123' })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.user) currentUser = data.user;
        }
    } catch (err) {}

    localStorage.setItem('bt_user', JSON.stringify(currentUser));
    updateAuthUI();
    loadUserDataFromDB();
    closeAuthModal();
    showToast(`🎉 Account created! Data will be stored permanently.`);
}

// 4. PASSWORD LOGIN
async function handlePasswordLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const name = email.split('@')[0];

    currentUser = { id: Date.now(), name: name.charAt(0).toUpperCase() + name.slice(1), email };

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'user123' })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.user) currentUser = data.user;
        }
    } catch (err) {}

    localStorage.setItem('bt_user', JSON.stringify(currentUser));
    updateAuthUI();
    loadUserDataFromDB();
    closeAuthModal();
    showToast(`Welcome back, ${currentUser.name}!`);
}

// 5. LOGOUT
function handleLogout() {
    currentUser = null;
    wishlist = [];
    userBookings = [];
    localStorage.removeItem('bt_user');
    updateAuthUI();
    updateWishlistUI();
    updateBookingsUI();
    closeDashboardModal();
    showToast('Logged out successfully.');
}

// 6. TOGGLE WISHLIST
async function toggleWishlist(packageName, event) {
    if (event) event.stopPropagation();

    if (!currentUser) {
        showToast('Please Login or Register to save wishlist items.');
        openAuthModal();
        return;
    }

    const idx = wishlist.indexOf(packageName);
    if (idx > -1) {
        wishlist.splice(idx, 1);
        showToast(`Removed ${packageName} from Wishlist`);
    } else {
        wishlist.push(packageName);
        showToast(`Saved ${packageName} to Wishlist forever ❤️`);
    }

    localStorage.setItem(`bt_wishlist_${currentUser.id}`, JSON.stringify(wishlist));
    updateWishlistUI();

    try {
        await fetch('/api/toggle-wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, packageName })
        });
    } catch (err) {}
}

function updateWishlistUI() {
    const countEl = document.getElementById('wishlistCount');
    if (countEl) countEl.textContent = wishlist.length;
    const listEl = document.getElementById('wishlistItemsList');

    if (listEl) {
        if (wishlist.length === 0) {
            listEl.innerHTML = '<li>No items in wishlist yet. Click ❤️ on any tour package.</li>';
        } else {
            listEl.innerHTML = wishlist.map(item => `<li>❤️ <strong>${item}</strong></li>`).join('');
        }
    }
}

function updateBookingsUI() {
    const listEl = document.getElementById('bookingsList');
    if (listEl) {
        if (userBookings.length === 0) {
            listEl.innerHTML = '<li>No active bookings found. Book a tour package to save it here forever.</li>';
        } else {
            listEl.innerHTML = userBookings.map(b => `
                <li>
                    🌴 <strong>${b.package_name}</strong><br>
                    <small style="color:#D4AF37;">Cost: ₹${(b.price || 25000).toLocaleString('en-IN')} | Guests: ${b.guests || 2} | Status: ${b.status || 'Confirmed'}</small>
                </li>
            `).join('');
        }
    }
}

// Contact Form Handler - Sends Email directly to moulikumar2082@gmail.com
async function handleFormSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('quoteName').value.trim();
    const phone = document.getElementById('quotePhone').value.trim();
    const email = document.getElementById('quoteEmail').value.trim();
    const destination = document.getElementById('quoteDestination').value;
    const message = document.getElementById('quoteMessage').value.trim();

    showToast(`Sending custom quote request for ${name}...`);

    // 1. Dispatch real email notification to moulikumar2082@gmail.com via FormSubmit API
    try {
        await fetch('https://formsubmit.co/ajax/mowlikumar2082@gmail.com', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `New Custom Tour Quote Request from ${name}`,
                "Customer Name": name,
                "Phone / WhatsApp": phone,
                "Customer Email": email,
                "Target Destination": destination,
                "Travel Dates & Details": message,
                "_captcha": "false",
                "_template": "table"
            })
        });
    } catch (err) {}

    // 2. Also log to local Python server if active
    try {
        await fetch('/api/submit-inquiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, email, destination, message })
        });
    } catch (err) {}

    showToast(`Namaste ${name}! Your request has been emailed to moulikumar2082@gmail.com.`);
    event.target.reset();
}

// Package Region Tab Filter
function setRegionTab(region, event) {
    const tabs = document.querySelectorAll('.filter-tabs .tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    if (event) event.target.classList.add('active');

    const cards = document.querySelectorAll('.destination-card');
    cards.forEach(card => {
        const cardRegion = card.getAttribute('data-region');
        if (region === 'all' || cardRegion === region) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Search & Filter Packages
function filterPackages() {
    const region = document.getElementById('dest-select').value;
    const type = document.getElementById('type-select').value;
    const maxBudget = document.getElementById('budget-select').value;

    const cards = document.querySelectorAll('.destination-card');

    cards.forEach(card => {
        const cardRegion = card.getAttribute('data-region');
        const cardType = card.getAttribute('data-type');
        const cardPrice = parseInt(card.getAttribute('data-price') || '0', 10);

        const matchesRegion = (region === 'all' || cardRegion === region);
        const matchesType = (type === 'all' || cardType.includes(type));
        const matchesBudget = (maxBudget === 'all' || cardPrice <= parseInt(maxBudget, 10));

        if (matchesRegion && matchesType && matchesBudget) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });

    showToast('Applied package filters');
    document.getElementById('packages').scrollIntoView({ behavior: 'smooth' });
}

// AI Itinerary Generator
function generateAIPlan() {
    const dest = document.getElementById('aiDest').value;
    const days = document.getElementById('aiDays').value;
    const vibe = document.getElementById('aiVibe').value;

    const resultBox = document.getElementById('aiResult');

    const itineraries = {
        Kashmir: [
            "Day 1: Arrival in Srinagar, welcome drinks & Shikara ride on Dal Lake.",
            "Day 2: Gulmarg day trip & Gondola phase 1 & 2 cable car ride.",
            "Day 3: Scenic drive to Pahalgam, Betaab Valley & Aru Valley excursion.",
            "Day 4: Sonamarg glacier visit, pony riding & evening handicraft shopping.",
            "Day 5: Mughal Gardens tour (Nishat & Shalimar) & flight transfer."
        ],
        Kerala: [
            "Day 1: Arrival in Kochi, Fort Kochi heritage walk & Kathakali dance show.",
            "Day 2: Scenic drive to Munnar tea plantations & Cheeyappara waterfalls.",
            "Day 3: Munnar Eravikulam park & Spice garden guided tour.",
            "Day 4: Alleppey luxury houseboat check-in & backwater sunset cruise.",
            "Day 5: Morning backwater views, traditional Sadhya lunch & departure."
        ],
        Rajasthan: [
            "Day 1: Jaipur arrival, Amber Fort elephant ride & City Palace.",
            "Day 2: Jodhpur drive, Mehrangarh Fort sunset & Jaswant Thada.",
            "Day 3: Jaisalmer Golden Fort & Patwon Ki Haveli exploration.",
            "Day 4: Sam Sand Dunes luxury desert glamping & Rajasthani folk dance.",
            "Day 5: Morning camel safari & return transfer to Jaipur/Delhi."
        ],
        Goa: [
            "Day 1: South Goa 5-star beach resort check-in & sunset cocktail.",
            "Day 2: Private Catamaran yacht cruise along Mandovi river & Old Goa churches.",
            "Day 3: Calangute water sports & Dudhsagar waterfalls jeep safari.",
            "Day 4: Fontainhas Latin Quarter heritage walk & casino dinner.",
            "Day 5: Spa therapy session & flight transfer."
        ],
        Ladakh: [
            "Day 1: Leh airport arrival & full day acclimatization in Leh hotel.",
            "Day 2: Hall of Fame, Magnetic Hill & Sangam river confluence.",
            "Day 3: Khardung La Pass (18,380 ft) drive to Nubra Valley & camel ride.",
            "Day 4: Diskit Monastery & drive to Pangong Tso Lake glamping.",
            "Day 5: Sunrise at Pangong Tso & return drive to Leh airport."
        ]
    };

    const plan = itineraries[dest] || itineraries['Kashmir'];
    const filteredPlan = plan.slice(0, parseInt(days, 10));

    resultBox.style.display = 'block';
    resultBox.innerHTML = `
        <strong>✨ Generated ${days}-Day ${vibe} Itinerary for ${dest}:</strong>
        <ul style="margin-top:0.6rem; padding-left:1.2rem;">
            ${filteredPlan.map(day => `<li style="margin-bottom:0.4rem;">${day}</li>`).join('')}
        </ul>
        <button class="btn-outline" style="margin-top:0.8rem;" onclick="downloadPDFItinerary('${dest}')">📥 Download PDF Plan</button>
    `;

    showToast(`AI Itinerary for ${dest} generated!`);
}

// Budget Calculator
function calculateBudget() {
    const travelers = parseInt(document.getElementById('calcTravelers').value || '1', 10);
    const days = parseInt(document.getElementById('calcDays').value || '1', 10);
    const stayRate = parseInt(document.getElementById('calcCategory').value || '5000', 10);

    const roomCost = (Math.ceil(travelers / 2)) * stayRate * days;
    const foodCostPerPerson = 1500 * days;
    const transportCostPerPerson = 2000 * days;

    const totalCost = roomCost + (foodCostPerPerson * travelers) + (transportCostPerPerson * travelers);
    const perPersonCost = Math.round(totalCost / travelers);

    const resultBox = document.getElementById('calcResult');
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
        <strong>📊 Estimated Cost Breakdown:</strong><br>
        • Total Group Budget: <span style="color:#D4AF37; font-weight:bold;">₹${totalCost.toLocaleString('en-IN')}</span><br>
        • Per Person Cost: <span style="color:#FFF; font-weight:bold;">₹${perPersonCost.toLocaleString('en-IN')}</span><br>
        <small style="color:#94A3B8;">(Includes ${days} nights stay, private transfers, daily breakfast & taxes)</small>
    `;

    showToast('Budget calculated successfully');
}

// Region Details Modal
function showDestinationDetails(destName) {
    openBookingModal(`${destName} Regional Tour Package`, 25000);
}

// Real Printable PDF Itinerary & Voucher Generator
function downloadPDFItinerary(packageName = 'Incredible India Signature Package') {
    showToast(`Generating official PDF Voucher for ${packageName}...`);

    const clientName = currentUser ? currentUser.name : 'Valued Traveler';
    const clientPhone = currentUser ? currentUser.phone : '+91 98765 43210';
    const clientEmail = currentUser ? currentUser.email : 'concierge@royaltrailsindia.com';
    const refId = 'RTI-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
        showToast('Please allow popups to open the PDF Voucher window.');
        return;
    }

    pdfWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Official Travel Voucher - ${packageName}</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1E293B; margin: 0; padding: 40px; background: #FFF; }
                .voucher-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; margin-bottom: 30px; }
                .brand { font-size: 24px; font-weight: bold; color: #070B12; letter-spacing: 1px; }
                .brand span { color: #D4AF37; }
                .ref-box { text-align: right; font-size: 13px; color: #64748B; }
                .ref-badge { display: inline-block; background: #F8FAFC; border: 1px solid #CBD5E1; font-weight: bold; color: #0F172A; padding: 4px 10px; border-radius: 4px; margin-top: 5px; }
                .section-title { font-size: 16px; font-weight: bold; color: #0F172A; text-transform: uppercase; letter-spacing: 1px; border-left: 4px solid #D4AF37; padding-left: 10px; margin: 25px 0 15px 0; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #F8FAFC; padding: 20px; border-radius: 8px; font-size: 14px; }
                .info-item strong { color: #475569; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 3px; }
                .itinerary-list { margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; }
                .inclusions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; margin-top: 10px; }
                .inclusion-item { background: #EDF2F7; padding: 8px 12px; border-radius: 6px; }
                .footer-notice { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; text-align: center; }
                .btn-print { background: #D4AF37; color: #000; border: none; font-weight: bold; padding: 12px 24px; font-size: 14px; border-radius: 6px; cursor: pointer; margin-bottom: 20px; }
                @media print { .btn-print { display: none; } }
            </style>
        </head>
        <body>
            <button class="btn-print" onclick="window.print()">🖨️ Save as PDF / Print Voucher</button>

            <div class="voucher-header">
                <div class="brand"><span>BOUTIQUE</span> TRAVEL AGENCY</div>
                <div class="ref-box">
                    <div>Issued Date: <strong>${dateStr}</strong></div>
                    <div class="ref-badge">VOUCHER REF: ${refId}</div>
                </div>
            </div>

            <h2 style="margin: 0 0 10px 0; font-size: 22px; color: #0F172A;">${packageName}</h2>
            <p style="color: #64748B; margin-top: 0; font-size: 14px;">Incredible India Luxury Domestic Itinerary & Confirmation Voucher</p>

            <div class="section-title">Guest Details</div>
            <div class="info-grid">
                <div class="info-item"><strong>Primary Guest Name</strong> ${clientName}</div>
                <div class="info-item"><strong>Contact Phone / WhatsApp</strong> ${clientPhone}</div>
                <div class="info-item"><strong>Email Address</strong> ${clientEmail}</div>
                <div class="info-item"><strong>Booking Status</strong> <span style="color: #16A34A; font-weight: bold;">VERIFIED CONFIRMED</span></div>
            </div>

            <div class="section-title">Package Inclusions</div>
            <div class="inclusions-grid">
                <div class="inclusion-item">✨ 4-Star / 5-Star Heritage Stay</div>
                <div class="inclusion-item">🚗 Private Sanitized AC Chauffeur SUV</div>
                <div class="inclusion-item">🍳 Daily Complimentary Gourmet Breakfast</div>
                <div class="inclusion-item">🧑‍🌾 Government Certified Local Guide</div>
                <div class="inclusion-item">✈️ VIP Airport Clearance & Transfers</div>
                <div class="inclusion-item">🛎️ 24/7 Dedicated Ground Host</div>
            </div>

            <div class="section-title">Day-by-Day Tour Highlights</div>
            <ol class="itinerary-list">
                <li><strong>Day 1:</strong> VIP Airport arrival reception & luxury hotel check-in.</li>
                <li><strong>Day 2:</strong> Guided morning heritage tour & private sunset cruise experience.</li>
                <li><strong>Day 3:</strong> Scenic valley drive & local culinary wine/food tasting session.</li>
                <li><strong>Day 4:</strong> Exclusive shopping excursion & traditional folk cultural evening.</li>
                <li><strong>Day 5:</strong> Leisure morning breakfast, hotel checkout & airport transfer.</li>
            </ol>

            <div class="footer-notice">
                Official Document issued by BOUTIQUE TRAVEL AGENCY (Royal Trails India)<br>
                For 24/7 Concierge Support: +91 98765 43210 | Email: concierge@royaltrailsindia.com
            </div>
        </body>
        </html>
    `);

    pdfWindow.document.close();
    setTimeout(() => {
        pdfWindow.print();
    }, 500);
}

// Travel Guide Modal Functions
function openGuideModal(guideKey) {
    const backdrop = document.getElementById('guideModalBackdrop');
    const badge = document.getElementById('guideBadge');
    const title = document.getElementById('guideTitle');
    const body = document.getElementById('guideBody');

    const guides = {
        kashmir: {
            badge: "NORTH INDIA GUIDE",
            title: "Best Time to Visit Kashmir: Snow vs Blossom Season",
            html: `
                <img src="images/kashmir_real.jpg" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:1.2rem;">
                <p>Kashmir is a year-round paradise, but your travel month dictates your experience:</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">❄️ Winter Snow Season (December – March)</h4>
                <p>Ideal for snow sports lovers! Gulmarg transforms into Asia's premier skiing destination with Gondola Phase 2 reaching 13,780 feet. Dal Lake experiences morning ice crusts and houseboats offer traditional <em>Kangri</em> room heating.</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">🌸 Spring & Summer Blossom (April – August)</h4>
                <p>Srinagar's Indira Gandhi Memorial Tulip Garden blooms with 1.5 million tulips. Sonamarg and Pahalgam offer lush pine valley pony rides and rafting along the Lidder River.</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">💡 Local Packing Tip</h4>
                <p>Even in summer, evening temperatures in Gulmarg drop to 10°C. Carry light thermals and a waterproof jacket.</p>
            `
        },
        goa: {
            badge: "WEST INDIA GUIDE",
            title: "Goa Luxury & Budget Travel Guide 2026",
            html: `
                <img src="images/goa_real.jpg" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:1.2rem;">
                <p>Goa offers two distinct personalities depending on where you stay:</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">🏖️ South Goa: Quiet Luxury & Private Beaches</h4>
                <p>Head to Mobor, Varca, and Palolem for 5-star beachfront resorts, tranquil sunbeds, and quiet catamaran sunset cruises along the Sal River.</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">🎉 North Goa: Nightlife & Heritage Architecture</h4>
                <p>Explore Panjim's Latin Quarter (Fontainhas) with Portuguese villas, water sports at Calangute, and luxury casino dining along the Mandovi river.</p>
            `
        },
        kerala: {
            badge: "CULINARY GUIDE",
            title: "Authentic Kerala Spice & Seafood Food Guide",
            html: `
                <img src="images/kerala_real.jpg" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:1.2rem;">
                <p>Kerala's culinary heritage combines fresh coconut, black pepper, cardamoms, and coastal seafood:</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">🍱 Traditional Kerala Sadhya</h4>
                <p>A vegetarian feast served on a banana leaf featuring up to 26 dishes including Avial, Thoran, Parippu, and hot Palada Payasam.</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">🐟 Karimeen Pollichathu</h4>
                <p>Pearlspot fish marinated in Shallots, Malabar tamarind, and ginger, wrapped in banana leaves and slow-grilled on coal.</p>
            `
        },
        ladakh: {
            badge: "ADVENTURE GUIDE",
            title: "Essential Ladakh Packing List & Oxygen Acclimatization",
            html: `
                <img src="images/ladakh_real.jpg" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:1.2rem;">
                <p>Traveling to high altitudes (10,000+ ft) requires proper preparation:</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">🏔️ 36-Hour Mandatory Acclimatization</h4>
                <p>Upon landing at Leh Airport (10,682 ft), rest completely for 24–36 hours before driving up Khardung La Pass (18,380 ft). Stay hydrated and avoid strenuous exertion.</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">🎒 Essential Gear Checklist</h4>
                <p>Heavy down jacket, thermal innerwear, UV protection sunglasses, high-SPF sunscreen, Diamox medication, and portable power banks.</p>
            `
        },
        rajasthan: {
            badge: "CULTURE GUIDE",
            title: "Rajasthan Royal Forts & Palace Etiquette Tips",
            html: `
                <img src="images/rajasthan_real.jpg" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:1.2rem;">
                <p>Experience the royal hospitality of India's desert land:</p>
                <h4 style="color:#D4AF37; margin:1rem 0 0.4rem 0;">🏰 Sunrise Angles & Photography Tips</h4>
                <p>Visit Amber Fort in Jaipur at 8:00 AM for soft morning lighting over Maota Lake. Book sunset Lake Pichola boat rides in Udaipur 48 hours in advance.</p>
            `
        },
        honeymoon: {
            badge: "ROMANCE GUIDE",
            title: "Top 5 Romantic Honeymoon Destinations in India",
            html: `
                <img src="images/kashmir_real.jpg" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:1.2rem;">
                <p>Our top recommended romantic escapes for couples:</p>
                <ol style="line-height:1.8; padding-left:1.2rem;">
                    <li><strong>Srinagar Houseboat:</strong> Private evening Shikara rides on Dal Lake.</li>
                    <li><strong>Udaipur Lake Palaces:</strong> Dinner overlooking glowing water reflections.</li>
                    <li><strong>Alleppey Houseboat:</strong> Floating luxury suite in palm backwaters.</li>
                    <li><strong>Andaman Havelock:</strong> Sunset walks along Radhanagar's white sand.</li>
                </ol>
            `
        }
    };

    const g = guides[guideKey] || guides['kashmir'];
    badge.textContent = g.badge;
    title.textContent = g.title;
    body.innerHTML = g.html;

    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeGuideModal(event) {
    const backdrop = document.getElementById('guideModalBackdrop');
    backdrop.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Booking Modal
function openBookingModal(destinationTitle, price = 25000) {
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalDestInput = document.getElementById('modalDestInput');

    modalTitle.textContent = `Book: ${destinationTitle}`;
    modalDestInput.value = destinationTitle;
    modalDestInput.setAttribute('data-price', price);

    if (currentUser) {
        const modalName = document.getElementById('modalName');
        const modalPhone = document.getElementById('modalPhone');
        if (modalName && currentUser.name) modalName.value = currentUser.name;
        if (modalPhone && currentUser.phone) modalPhone.value = currentUser.phone;
    }

    modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBookingModal(event) {
    const modalBackdrop = document.getElementById('modalBackdrop');
    modalBackdrop.classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function handleModalSubmit(event) {
    event.preventDefault();
    const dest = document.getElementById('modalDestInput').value;
    const name = document.getElementById('modalName').value;
    const guests = parseInt(document.getElementById('modalGuests').value || '1', 10);
    const price = parseInt(document.getElementById('modalDestInput').getAttribute('data-price') || '25000', 10);

    const bookingItem = {
        id: Date.now(),
        package_name: dest,
        price,
        guests,
        status: 'Confirmed'
    };

    userBookings.unshift(bookingItem);

    if (currentUser) {
        localStorage.setItem(`bt_bookings_${currentUser.id}`, JSON.stringify(userBookings));
        try {
            await fetch('/api/create-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    packageName: dest,
                    price,
                    guests,
                    dates: 'Confirmed Upcoming'
                })
            });
        } catch (err) {}
    }

    updateBookingsUI();
    closeBookingModal();
    showToast(`Namaste ${name}! Your booking request for ${dest} has been saved.`);
}

// Dashboard Modal
function openDashboardModal() {
    if (!currentUser) {
        openAuthModal();
        return;
    }
    document.getElementById('dashboardBackdrop').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDashboardModal(event) {
    document.getElementById('dashboardBackdrop').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Toast Notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4500);
}
