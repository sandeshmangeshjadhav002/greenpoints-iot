#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Servo.h>

// ── CONFIGURATION — edit these ─────────────────────────────────────────────
#define WIFI_SSID          "SJ"
#define WIFI_PASSWORD      "sandesh2"
#define SUPABASE_URL       "https://iiofsvustebhvtvbuxjj.supabase.co"
#define SUPABASE_ANON_KEY  "sb_publishable_qJSZFguprybdlVwMGqcu_w_gKkvuKmF"
#define BIN_CODE           "BIN-001"
#define BIN_HEIGHT_CM      30.0f    // measure your bin's interior height

// ── PINS ───────────────────────────────────────────────────────────────────
#define SERVO_PIN   2   // D4
#define TRIG_PIN   12   // D6
#define ECHO_PIN   13   // D7
#define IR_PIN     14   // D5  (LOW = object detected)

// ── SERVO ANGLES ───────────────────────────────────────────────────────────
#define LID_OPEN  90
#define LID_CLOSE  0

// ── TIMING ─────────────────────────────────────────────────────────────────
#define REPORT_MS    15000UL   // send data every 15 s
#define CLOSE_MS      5000UL   // auto-close lid after 5 s
#define POLL_MS       3000UL   // check open_lid command every 3 s

// ── STATE ──────────────────────────────────────────────────────────────────
Servo         servo;
WiFiClientSecure client;
bool          lidOpen    = false;
unsigned long lidAt      = 0;
unsigned long lastReport = 0;
unsigned long lastPoll   = 0;
bool          irSeen     = false;
String        binUUID    = "";

// ── WIFI ───────────────────────────────────────────────────────────────────
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println(" OK");
}

// ── SUPABASE HELPERS ───────────────────────────────────────────────────────
String sbGet(String path) {
  HTTPClient h;
  h.begin(client, String(SUPABASE_URL) + path);
  h.addHeader("apikey", SUPABASE_ANON_KEY);
  h.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  int c = h.GET();
  String r = c > 0 ? h.getString() : "";
  h.end();
  return r;
}

int sbPost(String path, String body) {
  HTTPClient h;
  h.begin(client, String(SUPABASE_URL) + path);
  h.addHeader("apikey", SUPABASE_ANON_KEY);
  h.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  h.addHeader("Content-Type", "application/json");
  h.addHeader("Prefer", "return=minimal");
  int c = h.POST(body);
  h.end();
  return c;
}

int sbPatch(String path, String body) {
  HTTPClient h;
  h.begin(client, String(SUPABASE_URL) + path);
  h.addHeader("apikey", SUPABASE_ANON_KEY);
  h.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  h.addHeader("Content-Type", "application/json");
  h.addHeader("Prefer", "return=minimal");
  int c = h.PATCH(body);
  h.end();
  return c;
}

// ── BIN UUID ───────────────────────────────────────────────────────────────
void fetchBinUUID() {
  String r = sbGet("/rest/v1/smart_bins?select=id&code=eq." + String(BIN_CODE));
  StaticJsonDocument<128> d;
  if (!deserializeJson(d, r) && d.size() > 0)
    binUUID = d[0]["id"].as<String>();
  Serial.println("UUID: " + binUUID);
}

// ── ULTRASONIC ─────────────────────────────────────────────────────────────
float readFill() {
  digitalWrite(TRIG_PIN, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long us = pulseIn(ECHO_PIN, HIGH, 30000UL);
  float dist = us ? (us * 0.0343f / 2.0f) : BIN_HEIGHT_CM;
  float pct  = ((BIN_HEIGHT_CM - dist) / BIN_HEIGHT_CM) * 100.0f;
  return constrain(pct, 0.0f, 100.0f);
}

// ── SERVO ──────────────────────────────────────────────────────────────────
void openLid()  { servo.write(LID_OPEN);  lidOpen = true;  lidAt = millis(); Serial.println("LID OPEN");  }
void closeLid() { servo.write(LID_CLOSE); lidOpen = false; Serial.println("LID CLOSE"); }

// ── PUSH DATA TO SUPABASE ──────────────────────────────────────────────────
void report(float fill, bool ir) {
  if (binUUID == "") { fetchBinUUID(); return; }

  String health = fill >= 90 ? "critical" : fill >= 75 ? "warning" : "good";
  String wifi   = WiFi.RSSI() < -75 ? "weak" : "connected";

  // 1. Update smart_bins
  StaticJsonDocument<200> d;
  d["fill_level"]    = (int)fill;
  d["health"]        = health;
  d["sensor_status"] = "online";
  d["wifi_status"]   = wifi;
  String b; serializeJson(d, b);
  int c = sbPatch("/rest/v1/smart_bins?code=eq." + String(BIN_CODE), b);
  Serial.printf("PATCH bins=%d fill=%.0f%% %s\n", c, fill, health.c_str());

  // 2. Insert bin_telemetry
  d.clear();
  d["bin_id"]        = binUUID;
  d["fill_level"]    = (int)fill;
  d["battery"]       = 100;
  d["sensor_status"] = "online";
  d["wifi_status"]   = wifi;
  b = ""; serializeJson(d, b);
  sbPost("/rest/v1/bin_telemetry", b);

  // 3. Insert sensor_readings
  d.clear();
  d["bin_id"]      = binUUID;
  d["device_id"]   = BIN_CODE;
  d["ir_detected"] = ir;
  d["calculated_fill_percent"] = (int)fill;
  d["bin_height_cm"]           = BIN_HEIGHT_CM;
  b = ""; serializeJson(d, b);
  int c2 = sbPost("/rest/v1/sensor_readings", b);
  Serial.printf("POST sensor=%d ir=%s\n", c2, ir ? "YES" : "no");

  // 4. Recycling event when IR fires
  if (ir) {
    float kg = max(0.1f, fill * 0.05f);
    d.clear();
    d["bin_id"]      = binUUID;
    d["waste_type"]  = "General";
    d["weight_kg"]   = kg;
    d["tokens_earned"] = 1 + (int)(kg * 2);
    b = ""; serializeJson(d, b);
    int c3 = sbPost("/rest/v1/recycling_events", b);
    Serial.printf("POST event=%d kg=%.2f\n", c3, kg);
  }
}

// ── POLL OPEN_LID COMMAND ──────────────────────────────────────────────────
void pollCommand() {
  String r = sbGet("/rest/v1/smart_bins?select=pending_command&code=eq." + String(BIN_CODE));
  StaticJsonDocument<128> d;
  if (deserializeJson(d, r) || !d.size()) return;
  const char* cmd = d[0]["pending_command"] | "";
  if (strcmp(cmd, "open_lid") == 0) {
    openLid();
    sbPatch("/rest/v1/smart_bins?code=eq." + String(BIN_CODE), "{\"pending_command\":null}");
  }
}

// ── SETUP / LOOP ───────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(IR_PIN,   INPUT_PULLUP);
  servo.attach(SERVO_PIN);
  servo.write(LID_CLOSE);
  client.setInsecure();
  connectWiFi();
  fetchBinUUID();
  Serial.println("Ready " BIN_CODE);
}

void loop() {
  if (lidOpen && millis() - lidAt > CLOSE_MS) closeLid();

  if (!irSeen && digitalRead(IR_PIN) == LOW) {
    irSeen = true;
    Serial.println("IR triggered");
  }

  if (millis() - lastPoll > POLL_MS) {
    lastPoll = millis();
    if (WiFi.status() == WL_CONNECTED) pollCommand();
  }

  if (millis() - lastReport > REPORT_MS) {
    lastReport = millis();
    if (WiFi.status() != WL_CONNECTED) { connectWiFi(); fetchBinUUID(); }
    float fill = readFill();
    Serial.printf("fill=%.0f%% ir=%s\n", fill, irSeen ? "YES" : "no");
    report(fill, irSeen);
    irSeen = false;
  }
}
