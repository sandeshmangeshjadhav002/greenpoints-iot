-- Migration 003: roles, points_transactions, sensor_readings, profile stat columns,
--                QR tokens, full-bin cleaner alerts, shop fulfillment
-- Safe to re-run (all statements are idempotent).

-- ─── 1. ROLES ───────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'user'
               check (role in ('user','cleaner','shop','admin')),
  shop_name  text,                          -- only meaningful when role = 'shop'
  created_at timestamptz not null default now(),
  unique (user_id)
);
alter table public.user_roles enable row level security;
drop policy if exists "users read own role"   on public.user_roles;
drop policy if exists "admins manage roles"   on public.user_roles;
create policy "users read own role"  on public.user_roles for select using (auth.uid() = user_id);
-- Writes are done server-side via service-role key; no client write policy needed.

-- ─── 2. POINTS TRANSACTIONS ─────────────────────────────────────────────────
create table if not exists public.points_transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  amount              integer not null,
  type                text not null check (type in ('earn','spend')),
  description         text,
  recycling_event_id  uuid references public.recycling_events(id) on delete set null,
  redemption_id       uuid references public.redemptions(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists pt_user_created_idx on public.points_transactions (user_id, created_at desc);
alter table public.points_transactions enable row level security;
drop policy if exists "users read own transactions" on public.points_transactions;
create policy "users read own transactions" on public.points_transactions for select using (auth.uid() = user_id);

-- ─── 3. SENSOR READINGS ─────────────────────────────────────────────────────
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
create index if not exists sr_bin_recorded_idx on public.sensor_readings (bin_id, recorded_at desc);
alter table public.sensor_readings enable row level security;
-- Reads by admins via service-role key only; no public policy needed.

-- ─── 4. EXTRA COLUMNS ON PROFILES ───────────────────────────────────────────
alter table public.profiles
  add column if not exists total_waste_kg      numeric(12,3) not null default 0,
  add column if not exists co2_saved_kg        numeric(12,3) not null default 0,
  add column if not exists streak_days         integer       not null default 0,
  add column if not exists disposal_count      integer       not null default 0,
  add column if not exists last_recycling_date timestamptz,
  add column if not exists level               text          not null default 'Bronze',
  add column if not exists level_progress      integer       not null default 0;

-- ─── 5. EXTRA COLUMNS ON SMART_BINS ─────────────────────────────────────────
alter table public.smart_bins
  add column if not exists height_cm          numeric(6,1) not null default 50,
  add column if not exists last_disposal_at   timestamptz,
  add column if not exists qr_token           text unique;   -- signed URL token for QR

-- ─── 6. EXTRA COLUMNS ON REDEMPTIONS (shop fulfillment) ─────────────────────
alter table public.redemptions
  add column if not exists fulfilled_by  uuid references public.profiles(id) on delete set null,
  add column if not exists fulfilled_at  timestamptz,
  add column if not exists notes         text;

-- ─── 7. award_points RPC ────────────────────────────────────────────────────
create or replace function public.award_points(
  p_user_id            uuid,
  p_amount             integer,
  p_recycling_event_id uuid default null,
  p_description        text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_new_balance integer;
begin
  update public.profiles
     set token_balance = token_balance + p_amount
   where id = p_user_id
   returning token_balance into v_new_balance;

  insert into public.points_transactions
    (user_id, amount, type, description, recycling_event_id)
  values
    (p_user_id, p_amount, 'earn', p_description, p_recycling_event_id);

  return coalesce(v_new_balance, 0);
end;
$$;

-- ─── 8. spend_points RPC ────────────────────────────────────────────────────
create or replace function public.spend_points(
  p_user_id       uuid,
  p_amount        integer,
  p_redemption_id uuid default null,
  p_description   text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_current integer;
  v_new_balance integer;
begin
  select token_balance into v_current
    from public.profiles
   where id = p_user_id
   for update;

  if v_current < p_amount then
    raise exception 'Insufficient token balance (have %, need %)', v_current, p_amount;
  end if;

  update public.profiles
     set token_balance = token_balance - p_amount
   where id = p_user_id
   returning token_balance into v_new_balance;

  insert into public.points_transactions
    (user_id, amount, type, description, redemption_id)
  values
    (p_user_id, p_amount, 'spend', p_description, p_redemption_id);

  return v_new_balance;
end;
$$;

-- ─── 9. Full-bin trigger → notify cleaners ──────────────────────────────────
create or replace function public.notify_cleaners_when_full()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cleaner record;
begin
  -- Fire only when fill_level crosses 90 (critical) for the first time in this update
  if NEW.fill_level >= 90 and (OLD.fill_level < 90 or OLD.fill_level is null) then
    for v_cleaner in
      select ur.user_id
        from public.user_roles ur
       where ur.role = 'cleaner'
    loop
      insert into public.notifications
        (user_id, title, message, category, read)
      values
        (
          v_cleaner.user_id,
          'Bin needs collection',
          'Bin ' || NEW.code || ' at ' || NEW.location || ' is ' || round(NEW.fill_level) || '% full.',
          'Alert',
          false
        )
      on conflict do nothing;
    end loop;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_cleaners on public.smart_bins;
create trigger trg_notify_cleaners
  after update of fill_level on public.smart_bins
  for each row execute procedure public.notify_cleaners_when_full();

-- ─── 10. QR token generation helper ─────────────────────────────────────────
-- Generates a stable short token for each bin's QR code.
-- The frontend embeds: /scan?bin=<qr_token>
-- The backend resolves qr_token → bin code.
update public.smart_bins
   set qr_token = encode(digest(code || '-qr-ecoloop', 'sha256'), 'hex')
 where qr_token is null;
