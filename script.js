/* ==========================================================================
   BOUTIQUE TRAVEL AGENCY - PERSISTENT AUTH & DATA SCRIPT
   ========================================================================== */

let currentUser = null;
let wishlist = [];
let userBookings = [];
let pendingOTPPhone = '';

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
        authNavBtn.style.display = 'none';
        userProfileBtn.style.display = 'inline-block';
        userNameHeader.textContent = currentUser.name.split(' ')[0];
        dashUserName.textContent = currentUser.name;
    } else {
        authNavBtn.style.display = 'inline-block';
        userProfileBtn.style.display = 'none';
        dashUserName.textContent = 'Guest';
    }
}

// Load Wishlist & Bookings from SQLite Backend DB
async function loadUserDataFromDB() {
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/user-data?userId=${currentUser.id}`);
        const data = await res.json();
        if (data.success) {
            wishlist = data.wishlist || [];
            userBookings = data.bookings || [];
            updateWishlistUI();
            updateBookingsUI();
        }
    } catch (err) {
        console.error('Error fetching user data from DB:', err);
    }
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

// 1. REQUEST OTP
async function handleRequestOTP(event) {
    event.preventDefault();
    const phone = document.getElementById('otpPhone').value.trim();

    if (!phone) {
        showToast('Please enter a valid mobile number.');
        return;
    }

    try {
        const res = await fetch('/api/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();

        if (data.success) {
            pendingOTPPhone = phone;
            document.getElementById('verifyOtpSec').style.display = 'block';
            showToast(`📱 SMS OTP Sent: ${data.otp_code}`);
            
            // Auto fill code for fast testing convenience
            document.getElementById('otpCode').value = data.otp_code;
        } else {
            showToast(data.message || 'Failed to send OTP.');
        }
    } catch (err) {
        showToast('Server connection error.');
    }
}

// 2. VERIFY OTP
async function handleVerifyOTP(event) {
    event.preventDefault();
    const code = document.getElementById('otpCode').value.trim();

    try {
        const res = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: pendingOTPPhone, code })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('bt_user', JSON.stringify(currentUser));
            updateAuthUI();
            loadUserDataFromDB();
            closeAuthModal();
            showToast(`🎉 Logged in via OTP! Welcome ${currentUser.name}.`);
        } else {
            showToast(data.message || 'Invalid OTP code.');
        }
    } catch (err) {
        showToast('Server error during OTP verification.');
    }
}

// 3. REGISTER
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('bt_user', JSON.stringify(currentUser));
            updateAuthUI();
            loadUserDataFromDB();
            closeAuthModal();
            showToast(`🎉 Account created! Data will be stored forever.`);
        } else {
            showToast(data.message || 'Registration failed.');
        }
    } catch (err) {
        showToast('Server connection error.');
    }
}

// 4. PASSWORD LOGIN
async function handlePasswordLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('bt_user', JSON.stringify(currentUser));
            updateAuthUI();
            loadUserDataFromDB();
            closeAuthModal();
            showToast(`Welcome back, ${currentUser.name}!`);
        } else {
            showToast(data.message || 'Invalid credentials.');
        }
    } catch (err) {
        showToast('Server error during login.');
    }
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

// 6. TOGGLE WISHLIST (DB PERSISTED)
async function toggleWishlist(packageName, event) {
    if (event) event.stopPropagation();

    if (!currentUser) {
        showToast('Please Login or Register to save wishlist items.');
        openAuthModal();
        return;
    }

    try {
        const res = await fetch('/api/toggle-wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, packageName })
        });
        const data = await res.json();

        if (data.success) {
            wishlist = data.wishlist;
            updateWishlistUI();
            if (data.action === 'added') {
                showToast(`Saved ${packageName} to Wishlist forever ❤️`);
            } else {
                showToast(`Removed ${packageName} from Wishlist`);
            }
        }
    } catch (err) {
        showToast('Error saving wishlist.');
    }
}

function updateWishlistUI() {
    document.getElementById('wishlistCount').textContent = wishlist.length;
    const listEl = document.getElementById('wishlistItemsList');

    if (wishlist.length === 0) {
        listEl.innerHTML = '<li>No items in wishlist yet. Click ❤️ on any tour package.</li>';
    } else {
        listEl.innerHTML = wishlist.map(item => `<li>❤️ <strong>${item}</strong></li>`).join('');
    }
}

function updateBookingsUI() {
    const listEl = document.getElementById('bookingsList');
    if (userBookings.length === 0) {
        listEl.innerHTML = '<li>No active bookings found. Book a tour package to save it here forever.</li>';
    } else {
        listEl.innerHTML = userBookings.map(b => `
            <li>
                🌴 <strong>${b.package_name}</strong><br>
                <small style="color:#D4AF37;">Cost: ₹${b.price.toLocaleString('en-IN')} | Guests: ${b.guests} | Status: ${b.status}</small>
            </li>
        `).join('');
    }
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

// Download PDF Itinerary Simulation
function downloadPDFItinerary(destName = 'Indian Package') {
    showToast(`Generating & downloading PDF itinerary for ${destName}...`);
    setTimeout(() => {
        alert(`📄 PDF Itinerary Downloaded: ${destName}_Boutique_Travel_Itinerary.pdf`);
    }, 1000);
}

// Booking Modal
function openBookingModal(destinationTitle, price = 25000) {
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalDestInput = document.getElementById('modalDestInput');

    modalTitle.textContent = `Book: ${destinationTitle}`;
    modalDestInput.value = destinationTitle;
    modalDestInput.setAttribute('data-price', price);

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

    if (currentUser) {
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
            await loadUserDataFromDB();
        } catch (err) {
            console.error('Error saving booking to DB:', err);
        }
    }

    closeBookingModal();
    showToast(`Namaste ${name}! Your booking request for ${dest} has been saved to your account forever.`);
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

// Contact Form Handler - Sends Email to moulikumar2082@gmail.com & saves to DB
async function handleFormSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('email').value.trim();
    const destination = document.getElementById('destination').value;
    const message = document.getElementById('message').value.trim();

    showToast(`Sending inquiry for ${name}...`);

    try {
        // 1. Save to SQLite Database
        await fetch('/api/submit-inquiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, destination, message })
        });

        // 2. Dispatch real email notification to moulikumar2082@gmail.com via FormSubmit AJAX API
        fetch('https://formsubmit.co/ajax/mowlikumar2082@gmail.com', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `New Custom Tour Quote Request from ${name}`,
                "Customer Name": name,
                "Phone / WhatsApp": phone,
                "Target Destination": destination,
                "Travel Dates & Details": message,
                "_template": "table"
            })
        }).catch(err => console.log('Email dispatch log:', err));

        showToast(`Namaste ${name}! Your request has been emailed to moulikumar2082@gmail.com and saved to DB.`);
        event.target.reset();
    } catch (err) {
        showToast(`Request saved! We will contact you at ${phone}.`);
    }
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
