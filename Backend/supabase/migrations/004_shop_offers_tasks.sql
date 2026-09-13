-- Migration 004: shop-owned offers, cleaning tasks, user redemption history
-- Safe to re-run (all statements are idempotent).

-- ─── 1. Add shop_id to rewards ───────────────────────────────────────────────
alter table public.rewards
  add column if not exists shop_id uuid references public.profiles(id) on delete set null;

create index if not exists rewards_shop_idx on public.rewards (shop_id);

-- Shops can read all active rewards; they can write only their own
drop policy if exists "shops manage own rewards" on public.rewards;
create policy "shops manage own rewards" on public.rewards
  for all using (auth.uid() = shop_id);

-- ─── 2. Cleaning tasks ───────────────────────────────────────────────────────
create table if not exists public.cleaning_tasks (
  id           uuid primary key default gen_random_uuid(),
  bin_id       uuid not null references public.smart_bins(id) on delete cascade,
  assigned_to  uuid references public.profiles(id) on delete set null,  -- null = unassigned
  status       text not null default 'open'
               check (status in ('open','in_progress','done','cancelled')),
  priority     text not null default 'normal'
               check (priority in ('low','normal','high','critical')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists ct_assigned_status_idx on public.cleaning_tasks (assigned_to, status);
create index if not exists ct_bin_idx             on public.cleaning_tasks (bin_id);
alter table public.cleaning_tasks enable row level security;

drop policy if exists "cleaners read own tasks" on public.cleaning_tasks;
create policy "cleaners read own tasks" on public.cleaning_tasks
  for select using (auth.uid() = assigned_to);

-- ─── 3. Auto-create a cleaning task when a bin becomes critical (≥90%) ───────
create or replace function public.auto_create_cleaning_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.fill_level >= 90 and (OLD.fill_level < 90 or OLD.fill_level is null) then
    -- Only create if no open/in_progress task exists for this bin
    if not exists (
      select 1 from public.cleaning_tasks
       where bin_id = NEW.id
         and status in ('open','in_progress')
    ) then
      insert into public.cleaning_tasks (bin_id, priority, notes)
      values (
        NEW.id,
        'critical',
        'Auto-generated: bin ' || NEW.code || ' reached ' || round(NEW.fill_level) || '% fill.'
      );
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_auto_cleaning_task on public.smart_bins;
create trigger trg_auto_cleaning_task
  after update of fill_level on public.smart_bins
  for each row execute procedure public.auto_create_cleaning_task();
