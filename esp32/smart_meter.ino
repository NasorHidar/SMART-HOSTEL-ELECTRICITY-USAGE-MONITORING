/**
 * Smart Hostel Electricity Monitoring System
 * ESP32 Firmware — EmonLib + WiFi + HTTP POST to Node.js backend
 *
 * Hardware:
 *   - ZMPT101B voltage sensor → GPIO 35
 *   - SCT-013 current sensor  → GPIO 34
 *   - I2C LCD 16x2 (0x27)    → SDA=21, SCL=22
 *
 * Dependencies (install via Arduino Library Manager):
 *   - EmonLib
 *   - LiquidCrystal_I2C
 *   - ArduinoJson (v6.x)
 */

#include "EmonLib.h"
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ─── WiFi Configuration ────────────────────────────────────────────────────────
const char* WIFI_SSID     = "Room--202";
const char* WIFI_PASSWORD = "physics&iit";

// ─── Backend Server Configuration ─────────────────────────────────────────────
// Node.js backend — PC's Wi-Fi IP (192.168.0.106 from ipconfig)
const char* SERVER_IP     = "192.168.0.106";
const int   SERVER_PORT   = 5000;
const char* ENDPOINT      = "/api/readings";

// ─── Device Identity ───────────────────────────────────────────────────────────
const char* ESP_ID        = "ESP-2049";

// ─── LCD (I2C address 0x27) ────────────────────────────────────────────────────
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ─── Energy Monitor ────────────────────────────────────────────────────────────
EnergyMonitor emon;

// Calibration values
#define vCalibration   106.8
#define currCalibration  3.0

// ─── State ─────────────────────────────────────────────────────────────────────
float         kWh        = 0;
unsigned long lastMillis = 0;
bool          screenToggle = false;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Block until WiFi is connected, with LCD + serial feedback. */
void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.print(WIFI_SSID);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  lcd.setCursor(0, 1);
  lcd.print(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempts++;
    if (attempts > 60) { // 30 s timeout → restart
      Serial.println("\n[WiFi] Timeout — restarting…");
      ESP.restart();
    }
  }

  Serial.println("\n[WiFi] Connected!");
  Serial.print("[WiFi] IP Address: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected!");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(2000);
}

/**
 * Send a JSON reading to the backend via HTTP POST.
 * Returns the HTTP response code, or -1 on error.
 */
int postReading(float voltage, float current, float power, float energy) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi disconnected — skipping POST");
    return -1;
  }

  // Build URL
  char url[128];
  snprintf(url, sizeof(url), "http://%s:%d%s", SERVER_IP, SERVER_PORT, ENDPOINT);

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["esp_id"]   = ESP_ID;
  doc["voltage"]  = round(voltage  * 100) / 100.0;
  doc["current"]  = round(current  * 1000) / 1000.0;
  doc["power"]    = round(power    * 100) / 100.0;
  doc["energy"]   = energy;

  char payload[256];
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000); // 5 s timeout

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.printf("[HTTP] POST %s → %d\n", ENDPOINT, httpCode);
  } else {
    Serial.printf("[HTTP] POST failed: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  return httpCode;
}

// ─── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // I2C + LCD
  Wire.begin(21, 22);
  lcd.begin(16, 2);
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Smart Meter v2");
  delay(2000);
  lcd.clear();

  // Sensor pins
  emon.voltage(35, vCalibration, 1.7); // ZMPT101B → GPIO 35
  emon.current(34, currCalibration);   // SCT-013  → GPIO 34

  // WiFi
  connectWiFi();

  lastMillis = millis();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready!");
  delay(1000);
  lcd.clear();
}

// ─── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  // ── 1. Read sensors ──────────────────────────────────────────────────────────
  emon.calcVI(20, 2000);

  float voltage    = emon.Vrms;
  float rawCurrent = emon.Irms;
  float current    = 0.0;
  float power      = 0.0;

  // Noise filter — ignore sub-20 mA ghost readings
  if (rawCurrent >= 0.02) {
    current = rawCurrent;
    // If the SCT-013 wire is looped 5×, divide by 5:
    // current = current / 5.0;
    power = voltage * current;
  }

  // ── 2. Accumulate energy ─────────────────────────────────────────────────────
  unsigned long now      = millis();
  unsigned long elapsed  = now - lastMillis;   // ms
  lastMillis             = now;

  // kWh: P(W) × Δt(ms) / 3 600 000 000
  kWh += power * (float)elapsed / 3600000000.0f;

  // ── 3. Serial output ─────────────────────────────────────────────────────────
  Serial.printf("V: %.2f V | I: %.3f A | P: %.2f W | E: %.5f kWh\n",
                voltage, current, power, kWh);

  // ── 4. HTTP POST to backend ──────────────────────────────────────────────────
  postReading(voltage, current, power, kWh);

  // ── 5. LCD display (alternating screens) ─────────────────────────────────────
  lcd.clear();

  if (!screenToggle) {
    // Screen 1: Voltage & Current
    lcd.setCursor(0, 0);
    lcd.print("V: ");
    lcd.print(voltage, 1);
    lcd.print(" V");

    lcd.setCursor(0, 1);
    lcd.print("I: ");
    lcd.print(current, 3);
    lcd.print(" A");
  } else {
    // Screen 2: Power & Energy
    lcd.setCursor(0, 0);
    lcd.print("P: ");
    lcd.print(power, 1);
    lcd.print(" W");

    lcd.setCursor(0, 1);
    lcd.print("E: ");
    lcd.print(kWh, 4);
    lcd.print(" kWh");
  }

  screenToggle = !screenToggle;

  // Loop period is determined by calcVI (20 cycles × 2000 ms window)
  // No additional delay needed — calcVI itself takes ~2 s
}
