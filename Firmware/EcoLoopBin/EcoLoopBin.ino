#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "secrets.h"

constexpr unsigned long REPORT_INTERVAL_MS = 15000;
unsigned long lastReportAt = 0;

float readFillLevel() { return 0.0; } // Replace with ultrasonic distance-to-percent conversion.
float readBatteryPercent() { return 100.0; } // Replace with a voltage-divider calculation.

void connectWiFi() {
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

bool sendTelemetry() {
  WiFiClientSecure client;
  client.setInsecure(); // Development only: use client.setCACert(root_ca) in production.
  HTTPClient http;
  if (!http.begin(client, String(API_BASE_URL) + "/api/devices/" + BIN_CODE + "/telemetry")) return false;
  StaticJsonDocument<256> payload;
  payload["fill_level"] = readFillLevel(); payload["battery"] = readBatteryPercent();
  payload["sensor_status"] = "online"; payload["wifi_status"] = WiFi.RSSI() < -75 ? "weak" : "connected";
  String body; serializeJson(payload, body);
  http.addHeader("Content-Type", "application/json"); http.addHeader("X-Device-Key", DEVICE_API_KEY);
  int status = http.POST(body); http.end();
  return status >= 200 && status < 300;
}

void setup() { Serial.begin(115200); connectWiFi(); }
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (millis() - lastReportAt >= REPORT_INTERVAL_MS) { sendTelemetry(); lastReportAt = millis(); }
}
