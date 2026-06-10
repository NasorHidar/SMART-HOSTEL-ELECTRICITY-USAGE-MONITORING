# ⚡ Smart Hostel Electricity Monitoring System

A professional full-stack IoT application that monitors electricity usage in hostel rooms using an ESP32 micro-controller, processes telemetry via a Node.js/Express MERN API, performs real-time AI-powered anomaly detection with Gemini AI, and exposes a beautiful, responsive React Dashboard with dynamic bilingual (English/Bangla) localization and Bangladesh LT-A tariff progressive billing calculations.

---

## 🚀 Key Features

*   **Real-time Telemetry Processing:** Recieves voltage (V), current (A), power (W), and cumulative energy (kWh) from ESP32 every ~2 seconds.
*   **Bilingual Localization:** Switch seamlessly between **English** and **Bangla** translations on all authentication forms, telemetry metric cards, anomaly logs, billing breakdown tables, and charts.
*   **Bangladesh LT-A progressive Billing:** Automatically calculates and displays:
    *   **Today's energy cost** (progressive based on daily kWh).
    *   **Cumulative energy charge** (progressive based on cumulative register).
    *   **Detailed slab breakdown table** highlighting Lifeline (0-50 units @ 4.63 Tk) vs. Standard progressive steps (Step 1-6 @ 5.26 to 17.35 Tk) and the flat demand charge (42.00 Tk).
*   **Gemini AI Anomaly Detection:** Cron job checks active devices every 5 minutes using **Gemini 2.0 Flash** to identify prohibited resistive loads (kettles, rice cookers, heaters) and flags critical power spikes.
*   **MongoDB Time-Series Optimization:** Uses MongoDB Time-Series collections (`timeseries` schema config) for fast, optimized, time-ordered reads/writes.
*   **Vite React Charting:** Interactive, responsive 24-hour power and voltage Area Charts rendered in localized language numerals.
*   **CI/CD Pipeline:** Integrated GitHub Actions workflow for static frontend deployment to GitHub Pages on merges to `main`.

---

## 📐 Architecture

```
┌────────────────┐           ┌────────────────┐           ┌──────────────────┐
│  ESP32 Device  │           │ Express Server │           │    MongoDB       │
│  (EmonLib)     │           │  (Node.js)     │           │  (Time-Series)   │
│                ├──────────►│                ├──────────►│                  │
│ Telemetry      │ HTTP POST │ Route handlers │ DB Log    │ Readings, Alerts │
│ Sensor data    │ (2 secs)  │                │           │                  │
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
Smart Meter/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD Deployment configuration
├── esp32/
│   └── smart_meter.ino         # ESP32 firmware code (C++/Arduino)
├── backend/
│   ├── config/db.js            # MongoDB Mongoose database connector
│   ├── controllers/
│   │   ├── authController.js   # JWT generation and login/register handlers
│   │   └── readingController.js# Telemetry ingestion, aggregation & dashboard API
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification middleware
│   ├── models/
│   │   ├── Alert.js            # Mongoose model for AI-detected anomalies
│   │   ├── Reading.js          # Mongoose model optimized for time-series readings
│   │   └── User.js             # Mongoose model representing residents & limits
│   ├── routes/
│   │   ├── authRoutes.js       # Express routes for authentication
│   │   └── readingRoutes.js    # Express routes for telemetry & alerts
│   ├── services/
│   │   └── geminiService.js    # Gemini 2.0 Flash Cron Job anomaly analyzer
│   ├── .env                    # Backend environmental parameters (JWT, API keys)
│   ├── package.json            # Node backend dependencies
│   └── server.js               # Main Express entry point
└── frontend/
    ├── src/
    │   ├── api/api.js          # Axios API client with JWT interceptors
    │   ├── components/
    │   │   ├── AlertsPanel.jsx # AI warnings and dismissible notifications panel
    │   │   ├── MetricCard.jsx  # Glowing and animated telemetry metrics card
    │   │   └── PowerChart.jsx  # Recharts 24h average area chart
    │   ├── context/
    │   │   ├── AuthContext.jsx # Global authorization state
    │   │   └── LanguageContext.jsx # Bilingual translations state and math tools
    │   ├── pages/
    │   │   ├── DashboardPage.jsx # Core telemetry & billing control dashboard
    │   │   └── LoginPage.jsx   # Clean login authentication card
    │   ├── App.jsx             # Main routing shell
    │   ├── index.css           # Global custom typography and glassmorphism styling
    │   └── main.jsx            # React root renderer
    ├── index.html              # HTML entry page
    ├── postcss.config.js       # PostCSS config for Tailwind
    ├── tailwind.config.js      # Tailwind utility classes config
    ├── vite.config.js          # Vite build directory and routing configuration
    └── package.json            # Frontend React dependencies
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
*   [MongoDB](https://www.mongodb.com/) v6 or later (local community edition or Atlas cluster).
*   [Arduino IDE](https://www.arduino.cc/en/software) with ESP32 Core support.

### 2. Backend API Setup
1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Create a `.env` file from the environment template and populate your secrets:
    ```ini
    PORT=5000
    NODE_ENV=development
    MONGO_URI=mongodb://127.0.0.1:27017/smart_meter
    JWT_SECRET=your_jwt_signing_secret_string
    JWT_EXPIRES_IN=7d
    GEMINI_API_KEY=your_google_gemini_api_key
    ANOMALY_POWER_THRESHOLD=1000 # Trigger analysis above 1000W
    ```
3.  Install dependencies and start the local development server:
    ```bash
    npm install
    npm run dev
    ```
    *The API will start running on http://localhost:5000*

### 3. Seed Resident User
To log into the dashboard, register a resident device ID via the API:
```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"esp_id":"ESP-2049","student_name":"Alice Rahman","room_number":"101","daily_limit_kwh":5}'
```

### 4. Frontend Dashboard Setup
1.  Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install packages and launch Vite development web server:
    ```bash
    npm install
    npm run dev
    ```
    *Open http://localhost:5173 to access the dashboard. Authenticate using the Device ID: `ESP-2049`*

### 5. ESP32 Firmware Installation
1.  Open the firmware file `esp32/smart_meter.ino` in the Arduino IDE.
2.  Adjust configuration parameters at the top of the file:
    ```cpp
    const char* WIFI_SSID     = "Your-WiFi-Network";
    const char* WIFI_PASSWORD = "Your-WiFi-Password";
    const char* SERVER_IP     = "192.168.0.106"; // IP address of your API server host
    const int   SERVER_PORT   = 5000;
    const char* ESP_ID        = "ESP-2049";      // Must match registered DB id
    ```
3.  Install library dependencies through the Arduino Library Manager:
    *   **EmonLib** (by OpenEnergyMonitor)
    *   **LiquidCrystal_I2C** (by Frank de Brabander)
    *   **ArduinoJson** (v6.x)
4.  Select your ESP32 board and upload the firmware.

---

## 📡 API Endpoint Reference

| HTTP Method | API URL Endpoint | Authentication | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/register` | Public / Admin | Registers a student resident to a device ID |
| **POST** | `/api/login` | Public | Logs in with `esp_id` and returns a JWT |
| **POST** | `/api/readings` | ESP32 Client | Ingests real-time metrics sent from micro-controller |
| **GET** | `/api/dashboard/:esp_id`| Bearer JWT | Returns telemetry history, daily totals, AI alerts, and billing info |
| **PATCH**| `/api/alerts/:id/acknowledge`| Bearer JWT | Dismisses/acknowledges an active anomaly alert |
| **GET** | `/health` | Public | Returns API health status and timestamp |

---

## 🔮 Gemini AI Anomaly Cron
*   **Trigger:** Automated cron task fires every **5 minutes** (configured via `node-cron`).
*   **Target:** For each device pushing readings, it aggregates the last 5 minutes of telemetry.
*   **Verification:** If average load exceeds `ANOMALY_POWER_THRESHOLD * 0.5` (e.g. 500W), it issues a call to **Gemini 2.0 Flash** with a detailed analysis instructions prompt.
*   **Resolution:** Creates a high-priority warning card on the resident's dashboard if an anomaly is identified.
