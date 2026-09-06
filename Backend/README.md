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

Set `FRONTEND_ORIGIN` if the Vite frontend runs somewhere other than `http://localhost:5173`.

Add resource-specific endpoints after you create your Supabase tables, and configure Supabase Row Level Security before serving real users. Do not expose the server-side key to the frontend.
