-- Safe to run after a partial or previous 001 migration. It never drops data.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, display_name text, phone text,
  location text, avatar_url text, token_balance integer not null default 0, created_at timestamptz not null default now()
);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', '')) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table if not exists public.smart_bins (id uuid primary key default gen_random_uuid(), code text unique not null check (code ~ '^BIN-[A-Z0-9-]+$'), location text not null, waste_type text not null check (waste_type in ('Recyclable','Organic','General','E-Waste')), device_key_hash text not null, fill_level numeric(5,2) not null default 0 check (fill_level between 0 and 100), battery numeric(5,2) not null default 0 check (battery between 0 and 100), sensor_status text not null default 'offline' check (sensor_status in ('online','offline')), wifi_status text not null default 'disconnected' check (wifi_status in ('connected','weak','disconnected')), health text not null default 'critical' check (health in ('good','warning','critical')), last_seen_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.bin_telemetry (id bigint generated always as identity primary key, bin_id uuid not null references public.smart_bins(id) on delete cascade, fill_level numeric(5,2) not null check (fill_level between 0 and 100), battery numeric(5,2) not null check (battery between 0 and 100), sensor_status text not null check (sensor_status in ('online','offline')), wifi_status text not null check (wifi_status in ('connected','weak','disconnected')), weight_kg numeric(10,3), temperature_c numeric(6,2), recorded_at timestamptz not null default now());
create index if not exists bin_telemetry_bin_recorded_idx on public.bin_telemetry (bin_id, recorded_at desc);
create table if not exists public.recycling_events (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null, bin_id uuid not null references public.smart_bins(id), waste_type text not null, weight_kg numeric(10,3) not null check (weight_kg > 0), tokens_earned integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.rewards (id uuid primary key default gen_random_uuid(), name text not null, description text, category text, image_url text, token_cost integer not null check (token_cost > 0), stock integer, is_active boolean not null default true, created_at timestamptz not null default now());
create table if not exists public.redemptions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), reward_id uuid not null references public.rewards(id), token_cost integer not null, status text not null default 'pending', created_at timestamptz not null default now());
create table if not exists public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade, title text not null, message text not null, category text not null, read boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.user_badges (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, badge_code text not null, earned_at timestamptz not null default now(), unique(user_id, badge_code));
create table if not exists public.contact_messages (id uuid primary key default gen_random_uuid(), name text not null, email text not null, subject text not null, message text not null, created_at timestamptz not null default now());

alter table public.profiles enable row level security; alter table public.smart_bins enable row level security; alter table public.bin_telemetry enable row level security; alter table public.recycling_events enable row level security; alter table public.rewards enable row level security; alter table public.redemptions enable row level security; alter table public.notifications enable row level security; alter table public.user_badges enable row level security; alter table public.contact_messages enable row level security;
drop policy if exists "public bin status read" on public.smart_bins; create policy "public bin status read" on public.smart_bins for select using (true);
drop policy if exists "public rewards read" on public.rewards; create policy "public rewards read" on public.rewards for select using (is_active = true);
drop policy if exists "users read own profile" on public.profiles; create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "users update own profile" on public.profiles; create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "users read own notifications" on public.notifications; create policy "users read own notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "users read own events" on public.recycling_events; create policy "users read own events" on public.recycling_events for select using (auth.uid() = user_id);
drop policy if exists "users read own redemptions" on public.redemptions; create policy "users read own redemptions" on public.redemptions for select using (auth.uid() = user_id);
drop policy if exists "users read own badges" on public.user_badges; create policy "users read own badges" on public.user_badges for select using (auth.uid() = user_id);
