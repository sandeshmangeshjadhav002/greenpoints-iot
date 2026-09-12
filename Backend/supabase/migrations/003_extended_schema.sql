-- Safe idempotent migration: extends schema with IoT sensor readings, roles, and transaction ledger
create extension if not exists pgcrypto;

-- 1. User roles table (admin/user RBAC)
create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
drop policy if exists "users read own role" on public.user_roles;
create policy "users read own role" on public.user_roles for select using (auth.uid() = user_id);

-- 2. Sensor readings table (for ultrasonic / IR raw data from ESP)
create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  bin_id uuid not null references public.smart_bins(id) on delete cascade,
  device_id text not null,
  ultrasonic_distance_cm numeric(8,2),
  ir_detected boolean not null default false,
  calculated_fill_percent numeric(5,2),
  bin_height_cm numeric(5,2),
  recorded_at timestamptz not null default now()
);
create index if not exists sensor_readings_bin_recorded_idx on public.sensor_readings (bin_id, recorded_at desc);
alter table public.sensor_readings enable row level security;
drop policy if exists "admin read sensor readings" on public.sensor_readings;
create policy "admin read sensor readings" on public.sensor_readings for select using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

-- 3. Points transactions ledger (double-entry via security definer RPC only)
create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recycling_event_id uuid references public.recycling_events(id) on delete set null,
  redemption_id uuid references public.redemptions(id) on delete set null,
  amount integer not null,
  type text not null check (type in ('earn', 'spend', 'adjust', 'bonus')),
  description text,
  created_at timestamptz not null default now()
);
create index if not exists points_transactions_user_idx on public.points_transactions (user_id, created_at desc);
alter table public.points_transactions enable row level security;
drop policy if exists "users read own transactions" on public.points_transactions;
create policy "users read own transactions" on public.points_transactions for select using (auth.uid() = user_id);

-- 4. Add config columns to smart_bins
do $$ begin
  alter table public.smart_bins add column if not exists height_cm numeric(5,2) not null default 50;
  alter table public.smart_bins add column if not exists last_disposal_at timestamptz;
exception when others then null; end $$;

-- 5. Add profile columns (cumulative stats, streak, level)
do $$ begin
  alter table public.profiles add column if not exists total_waste_kg numeric(12,3) not null default 0;
  alter table public.profiles add column if not exists co2_saved_kg numeric(12,3) not null default 0;
  alter table public.profiles add column if not exists streak_days integer not null default 0;
  alter table public.profiles add column if not exists level text default 'Bronze';
  alter table public.profiles add column if not exists level_progress integer not null default 0;
  alter table public.profiles add column if not exists last_recycling_date timestamptz;
  alter table public.profiles add column if not exists disposal_count integer not null default 0;
exception when others then null; end $$;

-- 6. RPC: award_points (SECURITY DEFINER — called only by backend via service role)
create or replace function public.award_points(
  p_user_id uuid,
  p_amount integer,
  p_recycling_event_id uuid default null,
  p_description text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare new_balance integer;
begin
  if p_amount <= 0 then raise exception 'Points amount must be positive'; end if;

  update public.profiles
  set token_balance = token_balance + p_amount
  where id = p_user_id
  returning token_balance into new_balance;

  insert into public.points_transactions (user_id, recycling_event_id, amount, type, description)
  values (p_user_id, p_recycling_event_id, p_amount, 'earn', p_description);

  return new_balance;
end; $$;

-- 7. RPC: spend_points (SECURITY DEFINER — atomic balance check + deduct + ledger)
create or replace function public.spend_points(
  p_user_id uuid,
  p_amount integer,
  p_redemption_id uuid default null,
  p_description text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare current_balance integer; new_balance integer;
begin
  if p_amount <= 0 then raise exception 'Points amount must be positive'; end if;

  select token_balance into current_balance from public.profiles where id = p_user_id for update;
  if current_balance is null then raise exception 'User not found'; end if;
  if current_balance < p_amount then raise exception 'Insufficient token balance'; end if;

  update public.profiles
  set token_balance = token_balance - p_amount
  where id = p_user_id
  returning token_balance into new_balance;

  insert into public.points_transactions (user_id, redemption_id, amount, type, description)
  values (p_user_id, p_redemption_id, p_amount, 'spend', p_description);

  return new_balance;
end; $$;

-- 8. After first user signup, run this manually in SQL Editor to promote yourself:
-- insert into public.user_roles (user_id, role) values ('<YOUR_USER_UUID>', 'admin') on conflict do nothing;
