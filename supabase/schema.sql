-- Pulse Tracker schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists pgcrypto;

-- one row per activity you track (water, medicine, exercise, custom)
create table activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'sparkles',
  color_key text not null default 'other',
  start_date date not null,
  require_photo boolean not null default false,
  reminder_every_min int not null default 30,
  created_at timestamptz not null default now()
);

-- fixed times within a day that an activity must be checked off (e.g. "morning dose" 08:00)
create table checkpoints (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  label text not null,
  time_of_day time not null,
  sort_order int not null default 0
);

-- one row per checkpoint per day, once it's acted on
create table completions (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references checkpoints(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  date date not null,
  done boolean not null default false,
  note text,
  photo_url text,
  completed_at timestamptz,
  last_notified_at timestamptz,
  unique (checkpoint_id, date)
);

-- daily free-form journal, one entry per day
create table diary_entries (
  date date primary key,
  text text not null default '',
  updated_at timestamptz not null default now()
);

-- worry / needs-improvement notes, independent of streak/completion status
create table worry_notes (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  text text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- tracks which day-of-week grace days have already been used, per activity,
-- so the "1 free miss per week" rule doesn't get re-applied twice
create table grace_days_used (
  activity_id uuid not null references activities(id) on delete cascade,
  week_start date not null,
  used boolean not null default false,
  primary key (activity_id, week_start)
);

-- push token for this device, used by the Edge Function to send reminders
create table push_tokens (
  token text primary key,
  created_at timestamptz not null default now()
);

-- Row Level Security: since this is a single-user personal app with no login,
-- these tables are left open to the anon key. If you later add auth, add
-- policies scoped to auth.uid() here instead.
alter table activities enable row level security;
alter table checkpoints enable row level security;
alter table completions enable row level security;
alter table diary_entries enable row level security;
alter table worry_notes enable row level security;
alter table grace_days_used enable row level security;
alter table push_tokens enable row level security;

create policy "allow all - activities" on activities for all using (true) with check (true);
create policy "allow all - checkpoints" on checkpoints for all using (true) with check (true);
create policy "allow all - completions" on completions for all using (true) with check (true);
create policy "allow all - diary" on diary_entries for all using (true) with check (true);
create policy "allow all - worry_notes" on worry_notes for all using (true) with check (true);
create policy "allow all - grace_days" on grace_days_used for all using (true) with check (true);
create policy "allow all - push_tokens" on push_tokens for all using (true) with check (true);

-- Schedule the reminder check every 30 minutes.
-- Requires the pg_cron extension (enable it under Database > Extensions in Supabase).
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY before running.
--
-- select cron.schedule(
--   'check-overdue-checkpoints',
--   '*/30 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-reminders',
--     headers := jsonb_build_object('Authorization', 'Bearer YOUR_ANON_KEY')
--   );
--   $$
-- );
