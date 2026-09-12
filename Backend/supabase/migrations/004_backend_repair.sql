-- Final repair migration for the FastAPI backend.
-- Run 001, 002, 003, then this file in the Supabase SQL editor.
-- This migration is idempotent and does not delete application data.

create extension if not exists pgcrypto;

-- Columns used by the current API that may be absent on databases created by 001.
alter table public.profiles
  add column if not exists total_waste_kg numeric(12,3) not null default 0,
  add column if not exists co2_saved_kg numeric(12,3) not null default 0,
  add column if not exists streak_days integer not null default 0,
  add column if not exists level text not null default 'Bronze',
  add column if not exists level_progress integer not null default 0,
  add column if not exists last_recycling_date timestamptz,
  add column if not exists disposal_count integer not null default 0;

alter table public.smart_bins
  add column if not exists height_cm numeric(8,2) not null default 50,
  add column if not exists last_disposal_at timestamptz;

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  bin_id uuid not null references public.smart_bins(id) on delete cascade,
  device_id text not null,
  ultrasonic_distance_cm numeric(8,2),
  ir_detected boolean not null default false,
  calculated_fill_percent numeric(5,2),
  bin_height_cm numeric(8,2),
  recorded_at timestamptz not null default now()
);

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

create index if not exists sensor_readings_bin_recorded_idx
  on public.sensor_readings (bin_id, recorded_at desc);
create index if not exists recycling_events_user_created_idx
  on public.recycling_events (user_id, created_at desc);
create index if not exists recycling_events_bin_created_idx
  on public.recycling_events (bin_id, created_at desc);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists points_transactions_user_created_idx
  on public.points_transactions (user_id, created_at desc);

-- Give every new Auth user a profile and least-privileged role.
-- Do not add an email column to profiles: email remains authoritative in auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill rows created before user_roles existed.
insert into public.user_roles (user_id, role)
select p.id, 'user'
from public.profiles p
left join public.user_roles r on r.user_id = p.id
where r.user_id is null;

-- Make points changes atomic and protect these privileged functions from direct
-- anonymous/authenticated PostgREST calls. The backend must use service_role.
create or replace function public.award_points(
  p_user_id uuid,
  p_amount integer,
  p_recycling_event_id uuid default null,
  p_description text default null
) returns integer
language plpgsql security definer set search_path = public
as $$
declare new_balance integer;
begin
  if p_amount <= 0 then raise exception 'Points amount must be positive'; end if;
  update public.profiles set token_balance = token_balance + p_amount
  where id = p_user_id returning token_balance into new_balance;
  if new_balance is null then raise exception 'User not found'; end if;
  insert into public.points_transactions (user_id, recycling_event_id, amount, type, description)
  values (p_user_id, p_recycling_event_id, p_amount, 'earn', p_description);
  return new_balance;
end;
$$;

create or replace function public.spend_points(
  p_user_id uuid,
  p_amount integer,
  p_redemption_id uuid default null,
  p_description text default null
) returns integer
language plpgsql security definer set search_path = public
as $$
declare current_balance integer; new_balance integer;
begin
  if p_amount <= 0 then raise exception 'Points amount must be positive'; end if;
  select token_balance into current_balance from public.profiles where id = p_user_id for update;
  if current_balance is null then raise exception 'User not found'; end if;
  if current_balance < p_amount then raise exception 'Insufficient token balance'; end if;
  update public.profiles set token_balance = token_balance - p_amount
  where id = p_user_id returning token_balance into new_balance;
  insert into public.points_transactions (user_id, redemption_id, amount, type, description)
  values (p_user_id, p_redemption_id, -p_amount, 'spend', p_description);
  return new_balance;
end;
$$;

-- Public reads are intentional for the map/status endpoint. Everything that
-- changes state is performed by the backend with its service-role key.
alter table public.user_roles enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.points_transactions enable row level security;

drop policy if exists "public bin status read" on public.smart_bins;
create policy "public bin status read" on public.smart_bins for select using (true);
drop policy if exists "public rewards read" on public.rewards;
create policy "public rewards read" on public.rewards for select using (is_active = true);
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "users read own events" on public.recycling_events;
create policy "users read own events" on public.recycling_events for select using (auth.uid() = user_id);
drop policy if exists "users read own redemptions" on public.redemptions;
create policy "users read own redemptions" on public.redemptions for select using (auth.uid() = user_id);
drop policy if exists "users read own badges" on public.user_badges;
create policy "users read own badges" on public.user_badges for select using (auth.uid() = user_id);
drop policy if exists "users read own role" on public.user_roles;
create policy "users read own role" on public.user_roles for select using (auth.uid() = user_id);
drop policy if exists "users read own transactions" on public.points_transactions;
create policy "users read own transactions" on public.points_transactions for select using (auth.uid() = user_id);
drop policy if exists "admin read sensor readings" on public.sensor_readings;
create policy "admin read sensor readings" on public.sensor_readings for select using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

revoke all on function public.award_points(uuid, integer, uuid, text) from public, anon, authenticated;
revoke all on function public.spend_points(uuid, integer, uuid, text) from public, anon, authenticated;
grant execute on function public.award_points(uuid, integer, uuid, text) to service_role;
grant execute on function public.spend_points(uuid, integer, uuid, text) to service_role;

-- Replace this UUID after deployment to promote the first administrator:
-- update public.user_roles set role = 'admin' where user_id = '<USER_UUID>'::uuid;
