# EcoLoop FastAPI backend

This service reads its Supabase credentials from `Backend/.env`; that file is ignored by Git.

## Setup

1. Copy `.env.example` to `.env` and enter the Supabase project URL and a server-side key.
2. Create and activate a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. Install dependencies and start the API:

   ```powershell
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

The health check is available at `http://localhost:8000/api/health`; interactive documentation is at `http://localhost:8000/docs`.

## Authentication

The frontend now uses `/login` for Supabase email/password sign-up and sign-in. In Supabase, configure **Authentication → URL Configuration** with your local frontend URL (`http://localhost:5173`) and your deployed URL. If email confirmation is enabled, a new user must confirm the message from Supabase before signing in.

## Supabase schema and device provisioning

1. In the Supabase SQL Editor, run [the initial migration](supabase/migrations/001_initial_schema.sql). If any part was previously run, use [the safe reconciliation migration](supabase/migrations/002_reconcile_schema.sql) instead.
2. Generate a unique key for each physical device and store only its SHA-256 hash in Supabase. In PowerShell:

   ```powershell
   $deviceKey = "replace-with-a-long-random-value"
   $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($deviceKey))).ToLower()
   ```

3. Insert the bin without sample telemetry:

   ```sql
   insert into public.smart_bins (code, location, waste_type, device_key_hash)
   values ('BIN-001', 'Your bin location', 'Recyclable', 'paste-the-hash-here');
   ```

4. Copy `Firmware/EcoLoopBin/secrets.example.h` to `secrets.h`, enter the same plaintext device key, then upload `EcoLoopBin.ino` using the Arduino IDE. Install the **ArduinoJson** library first.

For a physical ESP32, `API_BASE_URL` must be a reachable HTTPS address (or your computer's LAN address during local development); `localhost` points to the ESP32 itself, not to your computer.

The ESP32 sends telemetry every 15 seconds to `POST /api/devices/{code}/telemetry`. Each accepted payload is stored in `bin_telemetry`, updates `smart_bins`, and is pushed to connected Smart Bins screens through `/ws/bins`.

Set `FRONTEND_ORIGINS` to a comma-separated list if the Vite frontend runs at other origins.

Add resource-specific endpoints after you create your Supabase tables, and configure Supabase Row Level Security before serving real users. Do not expose the server-side key to the frontend.
