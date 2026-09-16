-- Migration 006: Fix cleaner notifications
-- Run in Supabase SQL Editor.

-- ─── 1. Fix the notification trigger ────────────────────────────────────────
-- The old trigger only fired on fill_level UPDATE.
-- This version also fires when health becomes 'critical' AND
-- handles direct NodeMCU writes correctly.

create or replace function public.notify_cleaners_when_full()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cleaner record;
begin
  -- Fire when fill crosses 90% OR health becomes critical
  if (NEW.fill_level >= 90 and (OLD.fill_level < 90 or OLD.fill_level is null))
     or (NEW.health = 'critical' and OLD.health != 'critical') then

    for v_cleaner in
      select ur.user_id
        from public.user_roles ur
       where ur.role in ('cleaner', 'admin')
    loop
      -- Only insert if no unread alert for this bin already exists
      if not exists (
        select 1 from public.notifications
         where user_id  = v_cleaner.user_id
           and category = 'Alert'
           and read     = false
           and message  like '%' || NEW.code || '%'
      ) then
        insert into public.notifications
          (user_id, title, message, category, read)
        values (
          v_cleaner.user_id,
          '🚨 Bin needs collection!',
          'Bin ' || NEW.code || ' at ' || NEW.location ||
          ' is ' || round(NEW.fill_level) || '% full. Please collect immediately.',
          'Alert',
          false
        );
      end if;
    end loop;
  end if;
  return NEW;
end;
$$;

-- Re-create trigger on both fill_level and health changes
drop trigger if exists trg_notify_cleaners on public.smart_bins;
create trigger trg_notify_cleaners
  after update of fill_level, health on public.smart_bins
  for each row execute procedure public.notify_cleaners_when_full();

-- ─── 2. Allow anon key to insert notifications (for direct NodeMCU path) ───
alter table public.notifications enable row level security;

drop policy if exists "anon insert notifications" on public.notifications;
create policy "anon insert notifications" on public.notifications
  for insert with check (true);

-- ─── 3. Function to manually trigger notifications for testing ───────────────
-- Usage: select public.test_cleaner_notification('BIN-001');
create or replace function public.test_cleaner_notification(bin_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_bin    record;
  v_count  integer := 0;
  v_cleaner record;
begin
  select * into v_bin from public.smart_bins where code = bin_code limit 1;
  if not found then return 'Bin not found'; end if;

  for v_cleaner in
    select ur.user_id from public.user_roles ur
     where ur.role in ('cleaner', 'admin')
  loop
    insert into public.notifications
      (user_id, title, message, category, read)
    values (
      v_cleaner.user_id,
      '🚨 Bin needs collection!',
      'Bin ' || v_bin.code || ' at ' || v_bin.location ||
      ' is ' || round(v_bin.fill_level) || '% full. Please collect immediately.',
      'Alert',
      false
    );
    v_count := v_count + 1;
  end loop;

  return 'Sent ' || v_count || ' notifications';
end;
$$;
