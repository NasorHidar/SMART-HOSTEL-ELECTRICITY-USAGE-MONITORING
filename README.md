# ⚡ Smart Hostel Electricity Monitoring System

A full-stack IoT application that monitors electricity usage in hostel rooms using an ESP32, exposes a MERN REST API, and provides AI-powered anomaly detection via Gemini.

---

## Architecture

```
ESP32 (EmonLib)
   └─ HTTP POST /api/readings (every 2 s)
         └─ Node.js / Express
               ├─ MongoDB (readings, alerts, users)
               └─ Gemini AI (every 5 min) → anomaly alerts
                     └─ React Dashboard (polls every 5 s)
```

---

## Project Structure

```
Smart Meter/
├── esp32/
│   └── smart_meter.ino        ← ESP32 firmware
│
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── readingController.js
│   ├── middleware/authMiddleware.js
│   ├── models/
│   │   ├── Alert.js
│   │   ├── Reading.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── readingRoutes.js
│   ├── services/geminiService.js
│   ├── .env                   ← ⚠ Fill in your values
│   ├── package.json
│   └── server.js
│
└── frontend/                  ← Vite + React + Tailwind CSS
    └── src/
        ├── api/api.js
        ├── components/
        │   ├── AlertsPanel.jsx
        │   ├── MetricCard.jsx
        │   └── PowerChart.jsx
        ├── context/AuthContext.jsx
        ├── pages/
        │   ├── DashboardPage.jsx
        │   └── LoginPage.jsx
        ├── App.jsx
        └── main.jsx
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB 6+ (local or Atlas)
- Arduino IDE with ESP32 board support

### 2. Backend Setup

```bash
cd backend

# Copy .env and fill in your values
# MONGO_URI, JWT_SECRET, GEMINI_API_KEY

npm install
npm run dev   # Starts on http://localhost:5000
```

### 3. Seed a User (first time only)

```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"esp_id":"ESP-2049","student_name":"Alice Rahman","room_number":"101"}'
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev   # Opens http://localhost:5173
```

Login with `ESP-2049`.

### 5. ESP32 Setup

1. Open `esp32/smart_meter.ino` in Arduino IDE.
2. Set `WIFI_SSID`, `WIFI_PASSWORD`, and `SERVER_IP` at the top of the file.
3. Install libraries via Library Manager:
   - **EmonLib**
   - **LiquidCrystal_I2C**
   - **ArduinoJson** (v6.x)
4. Flash to your ESP32.

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | None | Admin: create a user |
| POST | `/api/login` | None | Login with `esp_id`, returns JWT |
| POST | `/api/readings` | None | ESP32: save a reading |
| GET | `/api/dashboard/:esp_id` | Bearer JWT | Dashboard data |
| PATCH | `/api/alerts/:id/acknowledge` | Bearer JWT | Dismiss an alert |
| GET | `/health` | None | Health check |

---

## Gemini AI Anomaly Detection

- Runs every **5 minutes** via `node-cron`.
- Fetches the last 5 minutes of power readings for each active device.
- Calls **Gemini 2.0 Flash** with a structured prompt.
- Creates an `Alert` document if anomaly detected.
- Prevents duplicate alerts within a 10-minute window.

Threshold can be tuned in `.env`:
```
ANOMALY_POWER_THRESHOLD=1000  # Watts
```
