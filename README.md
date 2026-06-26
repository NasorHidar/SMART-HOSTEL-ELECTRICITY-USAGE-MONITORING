# ⚡ Smart Hostel Electricity Monitoring System

A secure, production-ready, full-stack IoT application designed to monitor, analyze, and manage electricity consumption across hostel rooms. Telemetry is collected in real-time by an ESP32 micro-controller, processed by a Node.js/Express backend, stored in an optimized MongoDB Time-Series collection, analyzed for anomalies by Gemini AI, and displayed on a premium bilingual (English/Bangla) React dashboard with secure online billing payments.

---

## 🚀 Key Features

*   **Real-time Telemetry & Data Logging:** Receives voltage (V), current (A), power (W), and cumulative energy (kWh) from the ESP32.
*   **Production-Grade Authentication:** Upgraded from passwordless access to a password-based system utilizing `bcryptjs` salted hashing.
*   **Telemetry Ingestion Security:** Fully secures the data endpoint (`POST /api/readings`) via custom `X-Device-Secret` token verification.
*   **Strict Ownership Authorization:** Restricts all dashboard telemetry, historical trends, carbon statistics, and AI alerts to the authenticated user owning that specific device.
*   **Bilingual Localization:** Switch seamlessly between **English** and **Bangla** translations on all dashboard views, charts, alert feeds, and billing breakdowns.
*   **Bangladesh LT-A Progressive Billing:** Computes energy costs based on Bangladesh residential step tariffs:
    *   **Lifeline Slab:** 0–50 units @ ৳4.63/kWh.
    *   **Standard Slabs:** Step 1 to 6 (৳5.26/kWh up to ৳17.35/kWh) + ৳42.00 flat monthly demand charge.
    *   *Backend Optimization:* Bills are calculated server-side to prevent client tampering.
*   **Gemini AI Anomaly Detection:** Regularly analyzes 5-minute telemetry windows using **Gemini 2.0 Flash** to detect prohibited high-power appliances (electric kettles, heaters) and triggers real-time alerts.
*   **SSLCommerz Payment Integration:** In-app payments supporting VISA, MasterCard, AMEX, bKash, Nagad, Rocket, and Upay. Features automated server-to-server transaction validation, payment history search, pagination, and PDF receipt downloads.
*   **MongoDB Time-Series Optimization:** Leverages MongoDB Time-Series collections (`timeseries` schema configuration) for highly optimized time-series logging.

---

## 📐 Architecture

```
┌────────────────┐           ┌────────────────┐           ┌──────────────────┐
│  ESP32 Device  │           │ Express Server │           │    MongoDB       │
│  (EmonLib)     │           │  (Node.js)     │           │  (Time-Series)   │
│                ├──────────►│                ├──────────►│                  │
│ Telemetry      │ HTTP POST │ Route handlers │ DB Log    │ Readings, Alerts │
│ Sensor data    │ (30s)     │                │           │                  │
└────────────────┘           └───────┬────────┘           └──────────────────┘
                                     │
                                     │ cron schedule (5 mins)
                                     ▼
                             ┌────────────────┐
                             │  Gemini AI API │
                             │  (Anomalies)   │
                             └───────┬────────┘
                                     │ creates alert
                                     ▼
┌────────────────┐           ┌────────────────┐
│ React Frontend │           │    MongoDB     │
│ (Vite + Tail)  ├──────────►│                │
│                │ HTTP GET  │  Alerts Log    │
│ Poll (5 secs)  │           │                │
└────────────────┘           └────────────────┘
```

---

## 📁 Repository Directory Structure

```
Smart Hostel/
├── esp32/
│   └── smart_meter.ino         # ESP32 firmware code (C++/Arduino)
├── backend/
│   ├── config/db.js            # MongoDB Mongoose database connector
│   ├── controllers/
│   │   ├── authController.js   # JWT generation, registration & login logic
│   │   ├── paymentController.js# Bill payment, webhooks, and history handlers
│   │   └── readingController.js# Telemetry ingestion, dashboard & alert APIs
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification and user loading middleware
│   ├── models/
│   │   ├── Alert.js            # Mongoose model for AI-detected anomalies
│   │   ├── Payment.js          # Mongoose model for billing transactions
│   │   ├── Reading.js          # Mongoose model optimized for time-series readings
│   │   └── User.js             # Mongoose model with bcrypt pre-save password hooks
│   ├── routes/
│   │   ├── authRoutes.js       # Express routes for authentication
│   │   ├── paymentRoutes.js    # Express routes for payment validation and webhooks
│   │   └── readingRoutes.js    # Express routes for telemetry & alerts
│   ├── scripts/
│   │   └── seed.js             # Database seeder for dev/demo accounts
│   ├── services/
│   │   ├── geminiService.js    # Gemini 2.0 Flash Cron Job anomaly analyzer
│   │   └── paymentService.js   # SSLCommerz Payment Gateway service layer
│   ├── .env                    # Backend environmental configuration
│   ├── package.json            # Node backend dependencies
│   └── server.js               # Main Express entry point
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── api.js          # Axios API client with JWT interceptors
    │   │   └── paymentApi.js   # Axios endpoints for bill payments
    │   ├── components/
    │   │   ├── AlertsPanel.jsx # AI warnings and notifications panel
    │   │   ├── MetricCard.jsx  # Glowing telemetry metrics card
    │   │   └── PowerChart.jsx  # Recharts 24h average area chart
    │   ├── context/
    │   │   ├── AuthContext.jsx # Global authorization state
    │   │   └── LanguageContext.jsx # Bilingual translations state and math tools
    │   ├── pages/
    │   │   ├── DashboardPage.jsx # Core telemetry & billing control dashboard
    │   │   ├── LoginPage.jsx   # Authentication screen with password toggle
    │   │   ├── PaymentPage.jsx # Payment initiation & method selector card
    │   │   ├── PaymentHistory.jsx # Searchable & exportable payment history table
    │   │   ├── PaymentSuccess.jsx # Payment verification & digital receipt modal
    │   │   └── PaymentFailed.jsx # Payment cancel & failure status page
    │   ├── App.jsx             # Main routing shell
    │   ├── index.css           # Global custom typography and glassmorphism styling
    │   └── main.jsx            # React root renderer
    ├── package.json            # Frontend React dependencies
    └── vite.config.js          # Vite configuration
```

---

## 🔌 Hardware Wiring Specification

The ESP32 firmware reads raw analog data and converts it into RMS values:

| Sensor Module | Connection Type | ESP32 GPIO Pin | Description |
| :--- | :--- | :--- | :--- |
| **ZMPT101B** | Analog Input | `GPIO 35` | AC Voltage Transformer (Voltage reading) |
| **SCT-013-000**| Analog Input | `GPIO 34` | Non-invasive Current Clamp (Current reading) |
| **LCD 16x2 (I2C)**| I2C SDA | `GPIO 21` | LCD Data Line |
| **LCD 16x2 (I2C)**| I2C SCL | `GPIO 22` | LCD Clock Line |

---

## 🛠️ Installation & Setup

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) v18 or later.
*   [MongoDB](https://www.mongodb.com/) v6 or later.
*   [Arduino IDE](https://www.arduino.cc/en/software) with ESP32 Core support.

### 2. Backend API Setup
1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Create a `.env` file based on the template below:
    ```ini
    PORT=5000
    NODE_ENV=development
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_signing_secret_string
    JWT_EXPIRES_IN=7d
    GEMINI_API_KEY=your_google_gemini_api_key
    ANOMALY_POWER_THRESHOLD=1000
    SSL_STORE_ID=your_sslcommerz_store_id
    SSL_STORE_PASSWORD=your_sslcommerz_store_password
    SSL_IS_LIVE=false
    FRONTEND_URL=http://localhost:5173
    DEVICE_SECRET=SmartHostelDeviceSecret123
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Run the database seeder to populate sample telemetry, payments, alerts, and active resident accounts:
    ```bash
    npm run seed
    ```
5.  Start the development server:
    ```bash
    npm run dev
    ```

### 3. Frontend Setup
1.  Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies and start the Vite server:
    ```bash
    npm install
    ```
3.  Start the app:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:5173` to access the dashboard.
    *   **Demo Resident ID:** `ESP-2049`
    *   **Demo Password:** `ESP-2049`

### 4. ESP32 Firmware Upload
1.  Open `esp32/smart_meter.ino` in the Arduino IDE.
2.  Configure parameters at the top of the file:
    ```cpp
    const char* WIFI_SSID     = "Your-WiFi-SSID";
    const char* WIFI_PASSWORD = "Your-WiFi-Password";
    const char* SERVER_IP     = "192.168.x.x"; // IP of your backend server
    const int   SERVER_PORT   = 5000;
    const char* ESP_ID        = "ESP-2049";    // Must match a registered DB user
    const char* DEVICE_SECRET = "SmartHostelDeviceSecret123"; // Must match backend .env
    ```
3.  Install library dependencies through the Arduino Library Manager:
    *   **EmonLib** (by OpenEnergyMonitor)
    *   **LiquidCrystal_I2C** (by Frank de Brabander)
    *   **ArduinoJson** (v6.x)
4.  Upload the firmware to your ESP32 board.

---

## 📡 API Endpoint Reference

| HTTP Method | API URL Endpoint | Authentication | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/register` | Public / Admin | Registers a student resident to a device ID |
| **POST** | `/api/login` | Public | Authenticates credentials and returns a JWT |
| **POST** | `/api/readings` | ESP32 Client | Ingests real-time metrics (requires `X-Device-Secret`) |
| **GET** | `/api/dashboard/:esp_id`| Bearer JWT | Returns telemetry history, daily totals, AI alerts, and billing info |
| **PATCH**| `/api/alerts/:id/acknowledge`| Bearer JWT | Dismisses/acknowledges an active anomaly alert |
| **GET** | `/api/payments/current-bill/:esp_id` | Bearer JWT | Calculates billing month summary and payment status |
| **POST** | `/api/payments/create`  | Bearer JWT | Initiates SSLCommerz payment session and returns redirect URL |
| **GET** | `/api/payments/history/:esp_id` | Bearer JWT | Returns paginated payment records (with search & PDF export options) |
| **POST** | `/api/payments/webhook` | Public | Webhook handling success, failure, or cancellation from SSLCommerz |
| **GET** | `/api/dev/users` | Dev Utility | Lists and seeds users in development mode |
| **GET** | `/health` | Public | Returns API health status |
