# EcoLoop — Smart Waste Management & Reward Token System

A full-stack smart waste management and reward-token platform featuring a React (Vite) + Tailwind CSS frontend, FastAPI + Supabase backend, and ESP8266/ESP32 IoT hardware integration. Users earn EcoPoints by scanning QR codes on smart bins when disposing waste, then redeem points for shop rewards.

---

## Project Structure

```
greenpoints-iot/
├── Backend/          FastAPI + Supabase backend (Python)
│   ├── routers/      API route modules (auth, bins, devices, admin, ...)
│   ├── schemas/      Pydantic request/response models
│   ├── services/     Business logic (points, sensor, AI)
│   ├── supabase/migrations/  SQL schema migrations
│   ├── main.py       FastAPI entrypoint
│   ├── config.py     Settings + env loader
│   ├── database.py   Supabase client setup
│   └── requirements.txt
├── Firmware/
│   └── EcoLoopBin/   Arduino sketch for ESP8266/ESP32 smart bins
├── src/              Frontend (React 18 + Vite)
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## Quick Start (Full Stack)

### 1. Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### 2. Backend

```powershell
# Create and activate venv
py -m venv Backend/.venv
.\Backend\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r Backend/requirements.txt

# Configure environment
copy Backend\.env.example Backend\.env
# Edit Backend\.env with your Supabase credentials

# Start API
cd Backend
uvicorn main:app --reload --port 8000
```

- Health check: `http://localhost:8000/api/health`
- Interactive docs (Swagger): `http://localhost:8000/docs`

### 3. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL migrations in order from `Backend/supabase/migrations/` (start with `001_initial_schema.sql`).
3. In **Authentication → URL Configuration**, add `http://localhost:5173` (and your deployed URL).

---

## Frontend Tech Stack

- **React 18** + **Vite** — app shell and dev server
- **React Router v6** — client-side routing across 10+ pages
- **Tailwind CSS** — utility-first styling, dark mode via `class` strategy
- **Recharts** — all charts (area, bar, line, pie)
- **lucide-react** — icon set
- **WebSocket** (`/ws/bins`) — live smart-bin updates

### Frontend Pages

| Path             | Page                                  | Role          |
| ---------------- | ------------------------------------- | ------------- |
| `/`              | Landing                               | Public        |
| `/login`         | Login / Sign Up                       | Public        |
| `/dashboard`     | User Dashboard                        | Authenticated |
| `/bins`          | Smart Bins Map + List                 | Authenticated |
| `/rewards`       | Rewards Shop + Redemption             | Authenticated |
| `/leaderboard`   | Top EcoPoints Rankings                | Authenticated |
| `/analytics`     | Waste + CO2 Analytics                 | Authenticated |
| `/notifications` | Notifications                         | Authenticated |
| `/profile`       | User Profile                          | Authenticated |
| `/scan`          | QR Scanner (Dispose Waste)            | Authenticated |
| `/qr-print`      | Printable Bin QR Codes                | Admin         |
| `/admin/users`   | User Management                       | Admin         |
| `/shop`          | Shop Dashboard (offers + redemptions) | Shop          |
| `/cleaner`       | Cleaner Dashboard (tasks + bins)      | Cleaner       |
| `/about`         | About                                 | Public        |
| `/contact`       | Contact                               | Public        |

---

## Backend Tech Stack

- **FastAPI 0.115** — modern async Python web framework
- **Supabase (PostgreSQL)** — database, auth (JWT), storage
- **pydantic-settings** — typed environment config
- **python-jose + passlib[bcrypt]** — JWT signing + password hashing
- **httpx** — async HTTP client (AI service)

### Backend Dependencies (`Backend/requirements.txt`)

```
fastapi==0.115.12
uvicorn[standard]==0.34.0
supabase==2.31.0
pydantic-settings==2.8.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
httpx==0.27.2
```

### Backend Configuration (`Backend/.env`)

| Variable                          | Purpose                                  | Default                                            |
| --------------------------------- | ---------------------------------------- | -------------------------------------------------- |
| `SUPABASE_URL`                    | Supabase project URL                     | _(required)_                                       |
| `SUPABASE_KEY`                    | Supabase anon key                        | _(required)_                                       |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase service role key (admin ops)    | _(required)_                                       |
| `JWT_SECRET`                      | JWT signing secret (>=32 chars)          | `change-me-please-use-a-strong-32-char-secret-key` |
| `JWT_ALGORITHM`                   | JWT algorithm                            | `HS256`                                            |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token TTL                                | `1440` (24h)                                       |
| `FRONTEND_ORIGINS`                | Comma-separated CORS origins             | `http://localhost:5173`                            |
| `DEFAULT_BIN_HEIGHT_CM`           | Default bin height for fill calc         | `50`                                               |
| `FULL_THRESHOLD_PERCENT`          | Mark bin as full                         | `90`                                               |
| `NEAR_FULL_THRESHOLD_PERCENT`     | Mark bin as near-full                    | `75`                                               |
| `OFFLINE_TIMEOUT_SECONDS`         | Seconds before bin is offline            | `300`                                              |
| `POINTS_PER_KG_GENERAL`           | EcoPoints per kg (General waste)         | `2`                                                |
| `POINTS_PER_KG_RECYCLABLE`        | EcoPoints per kg (Recyclable)            | `5`                                                |
| `POINTS_PER_KG_ORGANIC`           | EcoPoints per kg (Organic)               | `3`                                                |
| `POINTS_PER_KG_EWASTE`            | EcoPoints per kg (E-Waste)               | `10`                                               |
| `POINTS_BASE_DISPOSAL`            | Bonus points per disposal event          | `1`                                                |
| `OPENAI_API_KEY`                  | Optional AI key for waste classification | _(optional)_                                       |
| `AI_MODEL`                        | AI model name for classification         | `gpt-3.5-turbo-0125`                               |

---

## API Endpoints

All JSON responses follow the envelope:

```json
{ "success": true, "data": { ... } }   // on success
{ "success": false, "error": "..." }   // on failure
```

Authenticated endpoints require header: `Authorization: Bearer <token>`

### System

| Method | Path           | Auth | Description                                         |
| ------ | -------------- | ---- | --------------------------------------------------- |
| `GET`  | `/api/health`  | —    | Service health (`status: ok`)                       |
| `POST` | `/api/contact` | —    | Submit contact form message                         |
| `WS`   | `/ws/bins`     | —    | WebSocket — live bin updates (`bin.updated` events) |

### Auth (`/api/auth`)

| Method | Path               | Auth   | Description                                   |
| ------ | ------------------ | ------ | --------------------------------------------- |
| `POST` | `/api/auth/signup` | —      | Register new user via Supabase email/password |
| `POST` | `/api/auth/login`  | —      | Sign in, returns JWT + user                   |
| `POST` | `/api/auth/logout` | Bearer | Invalidate session client-side                |
| `GET`  | `/api/auth/me`     | Bearer | Return current user from token                |

### Users (`/api/users`)

| Method | Path                         | Auth   | Description                               |
| ------ | ---------------------------- | ------ | ----------------------------------------- |
| `GET`  | `/api/users/me`              | Bearer | Get authenticated user profile            |
| `PUT`  | `/api/users/me`              | Bearer | Update profile (name, phone, avatar, ...) |
| `GET`  | `/api/users/me/points`       | Bearer | Token balance only                        |
| `GET`  | `/api/users/me/transactions` | Bearer | Paginated point transactions              |

### Smart Bins (`/api/bins`)

| Method   | Path                              | Auth   | Description                        |
| -------- | --------------------------------- | ------ | ---------------------------------- |
| `GET`    | `/api/bins`                       | —      | List all bins (public map)         |
| `GET`    | `/api/bins/all-qr`                | Bearer | QR tokens + scan URLs (print page) |
| `GET`    | `/api/bins/{code}`                | —      | Get single bin by code             |
| `GET`    | `/api/bins/{code}/latest-reading` | Bearer | Latest telemetry + sensor row      |
| `POST`   | `/api/bins`                       | Admin  | Create bin (hashes device key)     |
| `PUT`    | `/api/bins/{code}`                | Admin  | Update bin metadata / device key   |
| `DELETE` | `/api/bins/{code}`                | Admin  | Delete bin                         |

### IoT Devices (`/api/devices`)

Hardware authenticated via `X-Device-Key` header (SHA-256 hash stored in DB).

| Method | Path                            | Auth           | Description                                                                  |
| ------ | ------------------------------- | -------------- | ---------------------------------------------------------------------------- |
| `POST` | `/api/devices/sensor-data`      | `X-Device-Key` | Ingest ultrasonic + IR reading; detect disposal; broadcast bin update via WS |
| `POST` | `/api/devices/{code}/telemetry` | `X-Device-Key` | Store telemetry snapshot (fill %, battery, Wi-Fi)                            |
| `POST` | `/api/devices/{code}/open-lid`  | `X-Device-Key` | Signal lid-opened event                                                      |

Payload for `/sensor-data`:

```json
{
  "device_id": "BIN-001",
  "ultrasonic_distance": 12.5,
  "ir_detected": true
}
```

### Waste Disposal (`/api/waste`)

| Method | Path                        | Auth   | Description                                                      |
| ------ | --------------------------- | ------ | ---------------------------------------------------------------- |
| `POST` | `/api/waste/dispose/qr`     | Bearer | User scans QR → records event, awards points, sends notification |
| `POST` | `/api/waste/dispose/manual` | Admin  | Manual disposal entry for a user                                 |

### Points / Leaderboard (`/api/points`)

| Method | Path                       | Auth   | Description                  |
| ------ | -------------------------- | ------ | ---------------------------- |
| `GET`  | `/api/points/balance`      | Bearer | Current token balance        |
| `GET`  | `/api/points/transactions` | Bearer | Transaction history          |
| `GET`  | `/api/points/leaderboard`  | —      | Top N users by tokens earned |
| `GET`  | `/api/points/me/rank`      | Bearer | Authenticated user's rank    |

### Dashboard (`/api/dashboard`)

| Method | Path                                | Auth   | Description                                         |
| ------ | ----------------------------------- | ------ | --------------------------------------------------- |
| `GET`  | `/api/dashboard/summary`            | Bearer | Stats cards (tokens, CO₂, streak, level, rank, ...) |
| `GET`  | `/api/dashboard/weekly-activity`    | Bearer | Last 7 days kg + tokens                             |
| `GET`  | `/api/dashboard/waste-distribution` | Bearer | Pie-chart breakdown by waste type                   |
| `GET`  | `/api/dashboard/recent-activity`    | Bearer | Recent disposal events (paginated)                  |
| `GET`  | `/api/dashboard/badges`             | Bearer | Earned + available badges                           |

### Admin (`/api/admin`) — role: `admin`

| Method | Path                             | Auth  | Description                                          |
| ------ | -------------------------------- | ----- | ---------------------------------------------------- |
| `GET`  | `/api/admin/stats`               | Admin | Platform-wide KPIs (users, bins, waste, tokens, CO₂) |
| `GET`  | `/api/admin/users`               | Admin | List users (email, role, balance, join date)         |
| `GET`  | `/api/admin/bins`                | Admin | All bins (full admin payload)                        |
| `GET`  | `/api/admin/sensor-readings`     | Admin | Raw sensor readings (filterable by bin)              |
| `GET`  | `/api/admin/recycling-events`    | Admin | All disposal events with user + bin joins            |
| `GET`  | `/api/admin/points-transactions` | Admin | All point transactions                               |
| `GET`  | `/api/admin/full-bins`           | Admin | Bins ≥75% fill (for dispatching cleaners)            |

### Shop (`/api/shop`) — role: `shop` or `admin`

| Method   | Path                                 | Auth       | Description                                    |
| -------- | ------------------------------------ | ---------- | ---------------------------------------------- |
| `GET`    | `/api/shop/offers`                   | Shop/Admin | List shop's reward offers                      |
| `POST`   | `/api/shop/offers`                   | Shop/Admin | Create reward offer (name, cost, stock, image) |
| `PUT`    | `/api/shop/offers/{id}`              | Shop/Admin | Edit offer / toggle active                     |
| `DELETE` | `/api/shop/offers/{id}`              | Shop/Admin | Delete offer                                   |
| `GET`    | `/api/shop/redemptions`              | Shop/Admin | Pending + fulfilled redemptions                |
| `POST`   | `/api/shop/redemptions/{id}/fulfill` | Shop/Admin | Mark redemption as fulfilled                   |
| `POST`   | `/api/shop/redemptions/{id}/reject`  | Shop/Admin | Reject + refund tokens                         |

### Cleaner (`/api/cleaner`) — role: `cleaner` or `admin`

| Method | Path                                 | Auth          | Description                                               |
| ------ | ------------------------------------ | ------------- | --------------------------------------------------------- |
| `GET`  | `/api/cleaner/bins/full`             | Cleaner/Admin | Bins ≥ threshold (default 75%)                            |
| `GET`  | `/api/cleaner/bins/critical`         | Cleaner/Admin | Bins with `health=critical`                               |
| `GET`  | `/api/cleaner/stats`                 | Cleaner/Admin | Cleaner dashboard KPIs                                    |
| `POST` | `/api/cleaner/bins/{code}/collected` | Cleaner/Admin | Mark bin as emptied (resets fill to 0, closes open tasks) |
| `GET`  | `/api/cleaner/tasks`                 | Cleaner/Admin | Assigned cleaning tasks                                   |
| `POST` | `/api/cleaner/tasks/{id}/start`      | Cleaner/Admin | Move task to `in_progress`                                |

### AI (`/api/ai`) — Optional (requires `OPENAI_API_KEY`)

| Method | Path                         | Auth   | Description                                                                            |
| ------ | ---------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `POST` | `/api/ai/classify-waste`     | Bearer | Classify waste item into {General, Recyclable, Organic, E-Waste} from text/description |
| `GET`  | `/api/ai/sustainability-tip` | Bearer | Personalised sustainability tip based on user stats                                    |

---

## Authentication & Authorization

### Flow

1. User registers or signs in via `/api/auth/signup` or `/api/auth/login`.
2. Backend proxies credentials to **Supabase Auth** for verification.
3. Backend issues a **signed JWT** (`HS256`) containing:
   - `sub` — Supabase user UUID
   - `email`
   - `role` — resolved from `user_roles` table
   - `exp` — expiry (default 24h)
4. Frontend attaches the token as `Authorization: Bearer <token>` on every call.
5. `get_current_user()` dependency in `routers/auth.py` decodes and verifies the token.

### Roles

| Role      | Granted access                                                 |
| --------- | -------------------------------------------------------------- |
| `user`    | Dashboard, bins, scan QR, rewards, leaderboard, profile        |
| `shop`    | All user endpoints + Shop dashboard (offers, redemptions)      |
| `cleaner` | All user endpoints + Cleaner dashboard (tasks, bin collection) |
| `admin`   | Everything, including `/api/admin/*` and user/bin CRUD         |

Role checks use `require_role(...)` or `require_admin` FastAPI dependencies.

---

## EcoPoints Calculation (Server-Side)

Points are calculated in **Python config** `config.py` via `settings.points_for_waste_type()` and awarded in `services/points_service.py`.

```
EcoPoints = POINTS_BASE_DISPOSAL + (POINTS_PER_KG_<TYPE> × weight_kg)
```

| Waste Type | Points / kg |
| ---------- | ----------- |
| Recyclable | 5           |
| Organic    | 3           |
| E-Waste    | 10          |
| General    | 2           |

### User Levels

| Level    | Total Tokens  |
| -------- | ------------- |
| Bronze   | 0 – 499       |
| Silver   | 500 – 1,999   |
| Gold     | 2,000 – 4,999 |
| Platinum | 5,000+        |

CO₂ saved is calculated per-waste-type factor × weight (kg).

---

## IoT / Hardware (Firmware)

Located in `Firmware/EcoLoopBin/EcoLoopBin.ino` (Arduino IDE, ESP8266/ESP32).

**Sensors:**

- **HC-SR04 Ultrasonic** — measures distance from lid → fill % via:
  ```
  fill_pct = 100 − (distance_cm / bin_height_cm × 100)
  ```
- **IR sensor** — detects object passing through chute (disposal signal).

**Telemetry flow:**

1. Sensor read every 15 s.
2. `POST /api/devices/sensor-data` with `X-Device-Key` header.
3. Backend hashes the key, verifies against `smart_bins.device_key_hash`.
4. Stores reading in `sensor_readings`.
5. **Heuristic disposal detection** (IR true + fill delta > threshold) creates `recycling_events` row.
6. Updates `smart_bins` status and broadcasts via WebSocket `/ws/bins`.

**Device provisioning:**

1. Generate a long random key.
2. Hash with SHA-256 and store in `smart_bins.device_key_hash`.
3. Paste plaintext key into `Firmware/EcoLoopBin/secrets.h` (copy from `secrets.example.h`).
4. Upload sketch to ESP — install the `ArduinoJson` library first.

---

## Database Schema Highlights

Run migrations in order: `001 → 002 → 003 → 004 → 005 → 006`.

| Table                 | Purpose                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `profiles`            | One-per-user: display name, token balance, CO₂, streak, level, disposal count                  |
| `user_roles`          | `user_id` → role (`user` / `shop` / `cleaner` / `admin`) + `shop_name`                         |
| `smart_bins`          | Bin master: code, location, waste_type, height, fill_level, health, device_key_hash, qr_token  |
| `sensor_readings`     | Raw ultrasonic + IR rows per bin, timestamped                                                  |
| `bin_telemetry`       | Aggregated snapshots (fill%, battery, sensor, wifi status)                                     |
| `recycling_events`    | Each disposal: user_id (nullable for unattended), bin_id, waste_type, weight_kg, tokens_earned |
| `points_transactions` | Earn/spend ledger (type=earn\|spend, recycling_event_id / redemption_id FK)                    |
| `rewards`             | Shop offers (shop FK, name, image, token_cost, stock, is_active)                               |
| `redemptions`         | User redemptions (status pending/fulfilled/rejected, fulfilled_at, notes)                      |
| `cleaning_tasks`      | Bin cleaning work order (status, assigned_to, completed_at)                                    |
| `notifications`       | Per-user push/in-app messages                                                                  |
| `contact_messages`    | Submissions from the public Contact form                                                       |

**RLS (Row Level Security):** Enabled on all public tables; admin operations use the Supabase service-role client.

---

## Production Build

### Frontend

```bash
npm run build
npm run preview
```

Deploy `dist/` to Vercel, Netlify, or any static host. `vercel.json` included.

### Backend

- `Backend/Procfile` and `Backend/render.yaml` are provided for Render / Heroku-style PaaS deployments.
- Gunicorn / Uvicorn workers recommended.
- Ensure `FRONTEND_ORIGINS` is set to your deployed frontend URL.
- **Never commit `.env` or the service-role key.**

---

## Notes

- `src/data/*.js` provides fallback initial states; all live data comes from the FastAPI backend.
- Smart Bins screen listens on `/ws/bins` for real-time `bin.updated` events.
- Email confirmation (Supabase) must be completed before a new user can sign in.
- AI endpoints gracefully degrade: if `OPENAI_API_KEY` is empty, classification falls back to a rule-based system and tips use static templates.
