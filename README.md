# ⚡ NexTrack: An IoT-Based Energy Analytics and Cost Prediction Platform

A secure, production‑ready, full‑stack IoT application designed to **monitor, analyze, and manage** electricity consumption across university hostel rooms. Real‑time telemetry is collected by **ESP32** micro‑controllers, processed by a **Node.js / Express** backend, stored in an optimized **MongoDB Time‑Series** collection, analyzed for anomalies by **Google Gemini AI**, and displayed on a premium **bilingual (English / Bangla) React** dashboard with secure online billing via **SSLCommerz**.

---

## 🚀 Features

### Core Platform
| # | Feature | Description |
|---|---------|-------------|
| 1 | **Real‑time Telemetry** | Voltage (V), Current (A), Power (W), and cumulative Energy (kWh) streamed from ESP32 every 30 seconds via HTTP POST. |
| 2 | **Password‑Based Authentication** | `bcryptjs` salted password hashing, JWT session tokens, and `X‑Admin‑Secret` protected registration endpoint. |
| 3 | **Secure Telemetry Ingestion** | `X‑Device‑Secret` header validation on the `/api/readings` endpoint — prevents unauthorized data injection. |
| 4 | **Strict Ownership Authorization** | All dashboard data, telemetry, billing, alerts, and carbon stats are restricted to the authenticated user's registered ESP32 device. |
| 5 | **Bilingual Localization** | Seamless toggle between **English** and **বাংলা (Bangla)** on all dashboard views, charts, alerts, and billing breakdowns via `LanguageContext`. |
| 6 | **Bangladesh LT‑A Progressive Billing** | Accurate Lifeline + 6‑step tariff calculation with ৳42.00 flat monthly demand charge. Bills are computed server‑side to prevent client tampering. |
| 7 | **Gemini AI Anomaly Detection** | Cron job (every 5 minutes) feeds telemetry windows to **Gemini 2.0 Flash** to detect prohibited high‑power appliances (electric kettles, heaters, etc.). |
| 8 | **SSLCommerz Payment Gateway** | Full integration supporting VISA, MasterCard, AMEX, bKash, Nagad, Rocket, and Upay. Includes server‑to‑server transaction validation, payment history with search & pagination, and PDF receipt downloads. |
| 9 | **MongoDB Time‑Series Optimization** | Uses MongoDB's native Time‑Series collections for efficient high‑frequency telemetry storage and aggregation. |

### ✨ Advanced Features (Newly Implemented)
| # | Feature | Description |
|---|---------|-------------|
| 10 | **🌙 Light / Dark Mode** | Global theme switching via `ThemeContext.jsx` with Tailwind CSS `dark:` class support. User preference is **persisted in localStorage** across sessions. |
| 11 | **🌿 Carbon Footprint Dashboard** | Dedicated `CarbonDashboardPage` with real‑time CO₂ emission tracking (daily, weekly, monthly, lifetime), sustainability scoring, environmental equivalents (car km, tree offsets, smartphone charges), hostel leaderboard, and a 30‑day trend chart. Uses Bangladesh grid emission factor (0.67 kg CO₂/kWh). |
| 12 | **🏦 Dynamic Banking & MFS Logos** | High‑fidelity SVG renderers in `PaymentPage.jsx` for bKash, Nagad, Rocket, Upay, VISA, MasterCard, and AMEX — no external image dependencies. |
| 13 | **🔔 Real‑time Push Notifications** | **Socket.io** powered bi‑directional communication. When the Gemini AI detects an anomaly, an alert is pushed **instantly** to the user's dashboard — no polling required. Device‑scoped rooms ensure users only receive alerts for their own ESP32. |
| 14 | **🔊 Critical Anomaly Audio Alerts** | When a high‑severity anomaly arrives via Socket.io, the dashboard plays an **audible warning tone** using the Web Audio API. Visual toast notifications accompany the sound. |
| 15 | **🎙️ Voice Command Assistant** | `VoiceAssistant.jsx` — hands‑free dashboard navigation and data queries using the **Web Speech API**. Speak commands like "show my bill", "go to payments", or "what's my usage?" |
| 16 | **📄 Daily Automated PDF Reports & Email Dispatch** | A `node‑cron` job (midnight daily) generates a personalized PDF electricity report per user via `pdfkit` and emails it via `nodemailer`. Supports real SMTP or Ethereal test accounts. |
| 17 | **🤖 AI Sustainability Insights** | Daily cron (23:55) generates personalized energy‑saving recommendations per device using Gemini AI, stored in the `SustainabilityInsight` collection and surfaced on the Carbon Dashboard. |

---

## 📐 System Architecture

```text
┌─────────────────┐            ┌──────────────────┐            ┌──────────────────┐
│   ESP32 Device  │            │  Express Server  │            │     MongoDB      │
│   (EmonLib)     │            │   (Node.js)      │            │  (Time‑Series)   │
│                 ├───────────►│                  ├───────────►│                  │
│  Sensor Data    │ HTTP POST  │  Routes/Services │  Mongoose  │  Readings, Users │
│  (30 s cycle)   │ X‑Device‑  │                  │            │  Alerts, Payments│
│                 │ Secret     │                  │            │                  │
└─────────────────┘            └──────┬───────────┘            └──────────────────┘
                                      │
                          ┌───────────┼────────────┐
                          │           │            │
                     Cron (5 min)  Cron (00:00)  Cron (23:55)
                          │           │            │
                          ▼           ▼            ▼
                   ┌────────────┐ ┌──────────┐ ┌──────────────┐
                   │ Gemini AI  │ │ PDF/Email│ │ Sustainability│
                   │ Anomaly    │ │ Report   │ │ AI Insight    │
                   │ Detection  │ │ Service  │ │ Service       │
                   └─────┬──────┘ └──────────┘ └──────────────┘
                         │
                    Socket.io push
                         │
                         ▼
                   ┌─────────────────┐
                   │  React Frontend │
                   │  (Vite + Tailwind)│
                   │  • Dashboard     │
                   │  • Carbon Page   │
                   │  • Payments      │
                   │  • Voice Control │
                   │  • Dark Mode     │
                   └─────────────────┘
```

---

## 📁 Repository Structure

```
Smart-Meter/
├── esp32/                                    # 🔌 ESP32 Firmware
│   └── smart_meter.ino                       # Arduino C++ — sensor reading & HTTP POST
│
├── backend/                                  # ⚙️ Node.js / Express API
│   ├── config/
│   │   └── db.js                             # Mongoose connector with error handling
│   ├── controllers/
│   │   ├── authController.js                 # Login, registration, JWT issuance
│   │   ├── carbonController.js               # Carbon profile, trends, leaderboard, insights
│   │   ├── paymentController.js              # Bill calculation, SSLCommerz flow, webhooks
│   │   └── readingController.js              # Telemetry ingestion, dashboard & alert APIs
│   ├── middleware/
│   │   └── authMiddleware.js                 # JWT verification & user loading
│   ├── models/
│   │   ├── Alert.js                          # AI‑detected anomaly schema
│   │   ├── Payment.js                        # Billing transaction schema
│   │   ├── Reading.js                        # Time‑Series telemetry schema
│   │   ├── SustainabilityInsight.js          # Daily AI sustainability insight schema
│   │   └── User.js                           # Resident schema with bcrypt pre‑save hooks
│   ├── routes/
│   │   ├── authRoutes.js                     # /api/login, /api/register, /api/dev/users
│   │   ├── carbonRoutes.js                   # /api/carbon/* endpoints
│   │   ├── paymentRoutes.js                  # /api/payments/* endpoints
│   │   └── readingRoutes.js                  # /api/readings, /api/dashboard/*
│   ├── services/
│   │   ├── carbonService.js                  # CO₂ calculations, leaderboard, equivalents
│   │   ├── cronService.js                    # Daily PDF report cron job (midnight)
│   │   ├── emailService.js                   # Nodemailer email dispatch (SMTP/Ethereal)
│   │   ├── geminiService.js                  # Gemini 2.0 Flash anomaly detection cron
│   │   ├── paymentService.js                 # SSLCommerz gateway, LT‑A tariff calculator
│   │   ├── pdfService.js                     # PDFKit report generation
│   │   ├── socketService.js                  # Socket.io initialization & alert emitter
│   │   └── sustainabilityInsightService.js   # Daily AI sustainability cron (23:55)
│   ├── scripts/
│   │   └── seed.js                           # Database seeder for demo data
│   ├── .env.example                          # Environment variable template
│   ├── package.json
│   └── server.js                             # Express entry point + Socket.io + cron init
│
├── frontend/                                 # 🎨 React / Vite / Tailwind CSS
│   ├── src/
│   │   ├── api/
│   │   │   ├── api.js                        # Axios client with JWT interceptors
│   │   │   └── paymentApi.js                 # Payment‑specific API endpoints
│   │   ├── components/
│   │   │   ├── AlertsPanel.jsx               # AI anomaly notifications panel
│   │   │   ├── CarbonWidget.jsx              # Dashboard carbon footprint summary widget
│   │   │   ├── MetricCard.jsx                # Glowing telemetry metric cards
│   │   │   ├── PowerChart.jsx                # Recharts 24h power area chart
│   │   │   ├── VoiceAssistant.jsx            # Web Speech API voice command component
│   │   │   └── carbon/                       # Carbon Dashboard sub‑components
│   │   │       ├── CarbonLeaderboard.jsx     # Hostel efficiency ranking
│   │   │       ├── CarbonMetricCard.jsx      # Emission metric display
│   │   │       ├── CarbonSavings.jsx         # Period‑over‑period savings
│   │   │       ├── CarbonTrendChart.jsx      # 30‑day CO₂ trend chart
│   │   │       ├── EnvironmentalEquivalents.jsx  # Real‑world impact comparisons
│   │   │       ├── SustainabilityScore.jsx   # Eco‑score gauge
│   │   │       └── TreesOffset.jsx           # Tree offset calculator
│   │   ├── context/
│   │   │   ├── AuthContext.jsx               # Global auth state & JWT management
│   │   │   ├── LanguageContext.jsx           # EN/BN translations + number formatting
│   │   │   └── ThemeContext.jsx              # Light/Dark mode with localStorage persistence
│   │   ├── pages/
│   │   │   ├── CarbonDashboardPage.jsx       # Full carbon footprint dashboard
│   │   │   ├── DashboardPage.jsx             # Main telemetry dashboard + Socket.io + Audio
│   │   │   ├── LoginPage.jsx                 # Login screen with password visibility toggle
│   │   │   ├── PaymentPage.jsx               # Bill payment initiation + SVG bank logos
│   │   │   ├── PaymentHistory.jsx            # Searchable, paginated payment history
│   │   │   ├── PaymentSuccess.jsx            # Payment verification & digital receipt
│   │   │   └── PaymentFailed.jsx             # Payment failure/cancel status page
│   │   ├── App.jsx                           # React Router configuration
│   │   ├── index.css                         # Custom typography & glassmorphism styles
│   │   └── main.jsx                          # Root renderer (ThemeProvider wrapped)
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🔌 Hardware Wiring (ESP32)

| Sensor Module | Connection | ESP32 GPIO | Purpose |
|:---|:---|:---|:---|
| **ZMPT101B** | Analog Input | `GPIO 35` | AC Voltage Transformer |
| **SCT‑013‑000** | Analog Input | `GPIO 34` | Non‑invasive Current Clamp |
| **LCD 16×2 (I2C)** | SDA | `GPIO 21` | LCD Data Line |
| **LCD 16×2 (I2C)** | SCL | `GPIO 22` | LCD Clock Line |

---

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** v18 or later
- **MongoDB** v6 or later (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Arduino IDE** with ESP32 board core installed

### 1. Backend Setup
```bash
cd backend
cp .env.example .env        # Configure your environment variables
npm install
npm run seed                 # (Optional) Seed demo data
npm run dev                  # Starts API on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev                  # Vite dev server at http://localhost:5173
```

**Demo credentials:** ESP ID `ESP-2049` / Password `ESP-2049`

### 3. ESP32 Firmware
1. Open `esp32/smart_meter.ino` in Arduino IDE.
2. Configure at the top of the file:
   ```cpp
   const char* WIFI_SSID     = "Your-WiFi-SSID";
   const char* WIFI_PASSWORD = "Your-WiFi-Password";
   const char* SERVER_IP     = "192.168.x.x";
   const int   SERVER_PORT   = 5000;
   const char* ESP_ID        = "ESP-2049";
   const char* DEVICE_SECRET = "SmartHostelDeviceSecret123";
   ```
3. Install libraries via Arduino Library Manager:
   - **EmonLib** (OpenEnergyMonitor)
   - **LiquidCrystal_I2C** (Frank de Brabander)
   - **ArduinoJson** (v6.x)
4. Upload to your ESP32 board.

### Environment Variables

Create `backend/.env` based on `.env.example`:

```ini
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_signing_secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_google_gemini_api_key
ANOMALY_POWER_THRESHOLD=1000
SSL_STORE_ID=your_sslcommerz_store_id
SSL_STORE_PASSWORD=your_sslcommerz_store_password
SSL_IS_LIVE=false
FRONTEND_URL=http://localhost:5173
DEVICE_SECRET=SmartHostelDeviceSecret123
ADMIN_SECRET=your_admin_secret
CARBON_EMISSION_FACTOR=0.67
# SMTP (optional — falls back to Ethereal test account)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM="Smart Meter Team" <noreply@smartmeter.com>
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **POST** | `/api/register` | `X‑Admin‑Secret` | Register a new student / device pair |
| **POST** | `/api/login` | Public | Authenticate with `esp_id` & password → returns JWT |
| **GET**  | `/api/dev/users` | Dev mode only | List all users (auto‑seeds demo user if empty) |

### Telemetry & Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **POST** | `/api/readings` | `X‑Device‑Secret` | ESP32 telemetry ingestion |
| **GET**  | `/api/dashboard/:esp_id` | Bearer JWT | Full dashboard data (readings, alerts, billing) |
| **PATCH**| `/api/alerts/:id/acknowledge` | Bearer JWT | Acknowledge/dismiss an AI anomaly alert |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **GET**  | `/api/payments/current-bill/:esp_id` | Bearer JWT | Calculate current month bill |
| **POST** | `/api/payments/create` | Bearer JWT | Initiate SSLCommerz payment session |
| **GET**  | `/api/payments/history/:esp_id` | Bearer JWT | Paginated payment history (search + PDF) |
| **POST** | `/api/payments/webhook` | Public | SSLCommerz IPN callback (success/fail/cancel) |

### Carbon Footprint
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **GET** | `/api/carbon/:esp_id` | Bearer JWT | Full carbon profile (emissions, score, equivalents) |
| **GET** | `/api/carbon/trends/:esp_id` | Bearer JWT | 30‑day daily CO₂ trend data |
| **GET** | `/api/carbon/leaderboard` | Bearer JWT | Top 10 most efficient hostel rooms |
| **GET** | `/api/carbon/insights/:esp_id` | Bearer JWT | Latest 5 AI sustainability insights |

### Health Check
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **GET** | `/health` | Public | API health status with timestamp |

---

## 🧪 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Firmware** | C++ / Arduino, EmonLib, ArduinoJson, LiquidCrystal_I2C |
| **Backend** | Node.js, Express.js, Mongoose, Socket.io, node‑cron |
| **AI** | Google Gemini 2.0 Flash (`@google/generative-ai`) |
| **Database** | MongoDB (Time‑Series Collections) |
| **Payments** | SSLCommerz (`sslcommerz-lts`) |
| **PDF / Email** | PDFKit, Nodemailer |
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Socket.io Client |
| **Auth** | JSON Web Tokens, bcryptjs |
| **Browser APIs** | Web Audio API (audio alerts), Web Speech API (voice commands) |

---

## 👥 Authors

- **Nasor Hidar** — [@NasorHidar](https://github.com/NasorHidar)
- **MD. SHAHRIAR SHAKIB** — [@Shahsamsu1668](https://github.com/Shahsamsu1668)
- **SUHITA SRUTEE** — [@suhita-04](https://github.com/suhita-04)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
