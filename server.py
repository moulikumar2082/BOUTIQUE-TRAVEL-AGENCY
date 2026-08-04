# ==========================================================================
# BOUTIQUE TRAVEL AGENCY - PERSISTENT AUTHENTICATION & DATA SERVER (PYTHON)
# ==========================================================================

import http.server
import socketserver
import json
import sqlite3
import hashlib
import time
import random
import os
import urllib.parse

PORT = 8000
DB_FILE = "database.db"
TARGET_EMAIL = "moulikumar2082@gmail.com"

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # OTPs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS otps (
            phone TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        )
    ''')

    # Wishlists Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wishlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            package_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, package_name)
        )
    ''')

    # Bookings Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            package_name TEXT NOT NULL,
            price INTEGER NOT NULL,
            guests INTEGER NOT NULL,
            dates TEXT,
            status TEXT DEFAULT 'Confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Inquiries Table (for custom tour quotes sent to moulikumar2082@gmail.com)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            destination TEXT NOT NULL,
            message TEXT NOT NULL,
            target_email TEXT DEFAULT 'moulikumar2082@gmail.com',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

init_db()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

class BoutiqueRequestHandler(http.server.SimpleHTTPRequestHandler):

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data_bytes = self.rfile.read(content_length) if content_length > 0 else b'{}'
        
        try:
            post_data = json.loads(post_data_bytes.decode('utf-8'))
        except Exception:
            post_data = {}

        path = self.path

        # -------------------------------------------------------------
        # 1. REGISTER
        # -------------------------------------------------------------
        if path == '/api/register':
            name = post_data.get('name', '').strip()
            email = post_data.get('email', '').strip().lower()
            phone = post_data.get('phone', '').strip()
            password = post_data.get('password', '')

            if not name or not email or not phone or not password:
                return self._send_json({'success': False, 'message': 'All fields are required.'}, 400)

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            try:
                pass_hash = hash_password(password)
                cursor.execute('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
                               (name, email, phone, pass_hash))
                user_id = cursor.lastrowid
                conn.commit()
                conn.close()
                return self._send_json({
                    'success': True,
                    'message': 'Account created successfully!',
                    'user': {'id': user_id, 'name': name, 'email': email, 'phone': phone}
                })
            except sqlite3.IntegrityError:
                conn.close()
                return self._send_json({'success': False, 'message': 'Email or Phone already registered.'}, 409)

        # -------------------------------------------------------------
        # 2. PASSWORD LOGIN
        # -------------------------------------------------------------
        elif path == '/api/login':
            email = post_data.get('email', '').strip().lower()
            password = post_data.get('password', '')

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT id, name, email, phone, password_hash FROM users WHERE email = ?', (email,))
            row = cursor.fetchone()
            conn.close()

            if row and row[4] == hash_password(password):
                return self._send_json({
                    'success': True,
                    'message': 'Login successful!',
                    'user': {'id': row[0], 'name': row[1], 'email': row[2], 'phone': row[3]}
                })
            else:
                return self._send_json({'success': False, 'message': 'Invalid email or password.'}, 401)

        # -------------------------------------------------------------
        # 3. REQUEST OTP LOGIN
        # -------------------------------------------------------------
        elif path == '/api/request-otp':
            phone = post_data.get('phone', '').strip()
            if not phone:
                return self._send_json({'success': False, 'message': 'Phone number is required.'}, 400)

            otp_code = str(random.randint(100000, 999999))
            expires_at = int(time.time()) + 300

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('INSERT OR REPLACE INTO otps (phone, code, expires_at) VALUES (?, ?, ?)',
                           (phone, otp_code, expires_at))
            conn.commit()
            conn.close()

            return self._send_json({
                'success': True,
                'message': f'OTP sent successfully to {phone}!',
                'otp_code': otp_code
            })

        # -------------------------------------------------------------
        # 4. VERIFY OTP LOGIN
        # -------------------------------------------------------------
        elif path == '/api/verify-otp':
            phone = post_data.get('phone', '').strip()
            code = post_data.get('code', '').strip()

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT code, expires_at FROM otps WHERE phone = ?', (phone,))
            otp_row = cursor.fetchone()

            if not otp_row or otp_row[0] != code or int(time.time()) > otp_row[1]:
                conn.close()
                return self._send_json({'success': False, 'message': 'Invalid or expired OTP.'}, 400)

            cursor.execute('DELETE FROM otps WHERE phone = ?', (phone,))

            cursor.execute('SELECT id, name, email, phone FROM users WHERE phone = ?', (phone,))
            user_row = cursor.fetchone()

            if not user_row:
                name = f"Guest {phone[-4:]}"
                email = f"user_{phone}@boutiquetravel.com"
                cursor.execute('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
                               (name, email, phone, 'OTP_USER'))
                user_id = cursor.lastrowid
                user_data = {'id': user_id, 'name': name, 'email': email, 'phone': phone}
            else:
                user_data = {'id': user_row[0], 'name': user_row[1], 'email': user_row[2], 'phone': user_row[3]}

            conn.commit()
            conn.close()

            return self._send_json({
                'success': True,
                'message': 'OTP verified! Welcome back.',
                'user': user_data
            })

        # -------------------------------------------------------------
        # 5. SUBMIT TOUR INQUIRY (Email to moulikumar2082@gmail.com)
        # -------------------------------------------------------------
        elif path == '/api/submit-inquiry':
            name = post_data.get('name', '').strip()
            phone = post_data.get('phone', '').strip()
            destination = post_data.get('destination', '').strip()
            message = post_data.get('message', '').strip()

            if not name or not phone or not destination:
                return self._send_json({'success': False, 'message': 'Missing required inquiry fields.'}, 400)

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('INSERT INTO inquiries (name, phone, destination, message, target_email) VALUES (?, ?, ?, ?, ?)',
                           (name, phone, destination, message, TARGET_EMAIL))
            conn.commit()
            conn.close()

            print(f"\n📧 [EMAIL NOTIFICATION LOG] Mail queued for {TARGET_EMAIL}:")
            print(f"   - Name: {name}")
            print(f"   - Phone/WhatsApp: {phone}")
            print(f"   - Destination: {destination}")
            print(f"   - Details: {message}\n")

            return self._send_json({
                'success': True,
                'message': f'Tour request submitted and sent to {TARGET_EMAIL}!',
                'target_email': TARGET_EMAIL
            })

        # -------------------------------------------------------------
        # 6. SAVE / TOGGLE WISHLIST
        # -------------------------------------------------------------
        elif path == '/api/toggle-wishlist':
            user_id = post_data.get('userId')
            package_name = post_data.get('packageName')

            if not user_id or not package_name:
                return self._send_json({'success': False, 'message': 'User and Package required.'}, 400)

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM wishlists WHERE user_id = ? AND package_name = ?', (user_id, package_name))
            exists = cursor.fetchone()

            if exists:
                cursor.execute('DELETE FROM wishlists WHERE id = ?', (exists[0],))
                action = 'removed'
            else:
                cursor.execute('INSERT INTO wishlists (user_id, package_name) VALUES (?, ?)', (user_id, package_name))
                action = 'added'

            conn.commit()
            
            cursor.execute('SELECT package_name FROM wishlists WHERE user_id = ?', (user_id,))
            items = [r[0] for r in cursor.fetchall()]
            conn.close()

            return self._send_json({'success': True, 'action': action, 'wishlist': items})

        # -------------------------------------------------------------
        # 7. CREATE BOOKING
        # -------------------------------------------------------------
        elif path == '/api/create-booking':
            user_id = post_data.get('userId')
            package_name = post_data.get('packageName')
            price = post_data.get('price', 0)
            guests = post_data.get('guests', 1)
            dates = post_data.get('dates', 'Upcoming')

            if not user_id or not package_name:
                return self._send_json({'success': False, 'message': 'Missing booking details.'}, 400)

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('INSERT INTO bookings (user_id, package_name, price, guests, dates) VALUES (?, ?, ?, ?, ?)',
                           (user_id, package_name, price, guests, dates))
            conn.commit()
            conn.close()

            return self._send_json({'success': True, 'message': 'Booking saved successfully!'})

        else:
            return super().do_POST()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/user-data':
            params = urllib.parse.parse_qs(parsed.query)
            user_id = params.get('userId', [None])[0]

            if not user_id:
                return self._send_json({'success': False, 'message': 'UserId required'}, 400)

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            
            cursor.execute('SELECT package_name FROM wishlists WHERE user_id = ?', (user_id,))
            wishlist = [r[0] for r in cursor.fetchall()]

            cursor.execute('SELECT id, package_name, price, guests, dates, status, created_at FROM bookings WHERE user_id = ? ORDER BY id DESC', (user_id,))
            bookings = [{
                'id': r[0],
                'package_name': r[1],
                'price': r[2],
                'guests': r[3],
                'dates': r[4],
                'status': r[5],
                'created_at': r[6]
            } for r in cursor.fetchall()]

            conn.close()

            return self._send_json({
                'success': True,
                'wishlist': wishlist,
                'bookings': bookings
            })
        elif parsed.path == '/api/inquiries':
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT id, name, phone, destination, message, target_email, created_at FROM inquiries ORDER BY id DESC')
            inquiries = [{
                'id': r[0], 'name': r[1], 'phone': r[2], 'destination': r[3], 'message': r[4], 'target_email': r[5], 'created_at': r[6]
            } for r in cursor.fetchall()]
            conn.close()
            return self._send_json({'success': True, 'inquiries': inquiries})
        else:
            return super().do_GET()

if __name__ == '__main__':
    print(f"Starting Boutique Travel Persistent API Server on port {PORT}...")
    print(f"Target email notifications destination: {TARGET_EMAIL}")
    with socketserver.TCPServer(("", PORT), BoutiqueRequestHandler) as httpd:
        httpd.serve_forever()
