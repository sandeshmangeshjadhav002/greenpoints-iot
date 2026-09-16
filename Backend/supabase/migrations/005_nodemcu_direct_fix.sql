-- Migration 005: Fix NodeMCU direct-to-Supabase writes
-- Run this in Supabase SQL Editor. Safe to re-run.

-- ─── 1. Ensure all required tables exist ─────────────────────────────────

create table if not exists public.bin_telemetry (
  id            bigint generated always as identity primary key,
  bin_id        uuid not null references public.smart_bins(id) on delete cascade,
  fill_level    numeric(5,2) not null check (fill_level between 0 and 100),
  battery       numeric(5,2) not null default 100,
  sensor_status text not null default 'online',
  wifi_status   text not null default 'connected',
  weight_kg     numeric(10,3),
  temperature_c numeric(6,2),
  recorded_at   timestamptz not null default now()
);

create table if not exists public.sensor_readings (
  id                        bigint generated always as identity primary key,
  bin_id                    uuid not null references public.smart_bins(id) on delete cascade,
  device_id                 text not null,
  ultrasonic_distance_cm    numeric(8,2),
  ir_detected               boolean not null default false,
  calculated_fill_percent   numeric(5,2),
  bin_height_cm             numeric(6,1),
  recorded_at               timestamptz not null default now()
);

-- ─── 2. Add missing columns ───────────────────────────────────────────────

alter table public.smart_bins
  add column if not exists pending_command text,
  add column if not exists qr_token        text,
  add column if not exists height_cm       numeric(6,1) not null default 50,
  add column if not exists last_disposal_at timestamptz;

alter table public.user_roles
  add column if not exists shop_name text;

-- Fix role constraint to include cleaner and shop
alter table public.user_roles
  drop constraint if exists user_roles_role_check;
alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('user','cleaner','shop','admin'));

-- ─── 3. RLS policies for NodeMCU anon key writes ─────────────────────────

-- bin_telemetry: allow anon insert
alter table public.bin_telemetry enable row level security;
drop policy if exists "anon insert telemetry" on public.bin_telemetry;
create policy "anon insert telemetry" on public.bin_telemetry
  for insert with check (true);

-- sensor_readings: allow anon insert
alter table public.sensor_readings enable row level security;
drop policy if exists "anon insert sensor readings" on public.sensor_readings;
create policy "anon insert sensor readings" on public.sensor_readings
  for insert with check (true);

-- recycling_events: allow anon insert (NodeMCU creates events on IR detection)
alter table public.recycling_events enable row level security;
drop policy if exists "anon insert recycling events" on public.recycling_events;
create policy "anon insert recycling events" on public.recycling_events
  for insert with check (true);

-- smart_bins: allow anon to read (for bin lookup by NodeMCU) and update fill_level
drop policy if exists "anon update bin status" on public.smart_bins;
create policy "anon update bin status" on public.smart_bins
  for update using (true) with check (true);

-- ─── 4. Generate QR tokens for all bins that don't have one ──────────────
update public.smart_bins
  set qr_token = encode(digest(code || '-qr-ecoloop', 'sha256'), 'hex')
where qr_token is null;
