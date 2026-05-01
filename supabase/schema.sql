create table if not exists public.support_tasks (
  id text primary key,
  title text not null,
  category text not null check (category in ('hygiene', 'school', 'admin', 'health', 'life')),
  description text not null default '',
  normal_interval_days integer not null check (normal_interval_days > 0),
  max_gap_days integer not null check (max_gap_days >= normal_interval_days),
  last_completed_at timestamptz not null,
  status text not null default 'ok' check (status in ('ok', 'due', 'snoozed', 'needs_help', 'escalated')),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_history (
  id text primary key,
  task_title text not null,
  action_type text not null check (action_type in ('done', 'already_did_it', 'snooze', 'need_help', 'created')),
  created_at timestamptz not null default now()
);

create index if not exists support_tasks_status_idx on public.support_tasks(status);
create index if not exists support_history_created_at_idx on public.support_history(created_at desc);

alter table public.support_tasks enable row level security;
alter table public.support_history enable row level security;

-- Prototype policies:
-- These allow the public app, using the publishable key, to read and write demo data.
-- Replace these with authenticated-user policies before storing sensitive real data.
drop policy if exists "prototype can read support tasks" on public.support_tasks;
drop policy if exists "prototype can write support tasks" on public.support_tasks;
drop policy if exists "prototype can read support history" on public.support_history;
drop policy if exists "prototype can write support history" on public.support_history;

create policy "prototype can read support tasks"
  on public.support_tasks
  for select
  to anon, authenticated
  using (true);

create policy "prototype can write support tasks"
  on public.support_tasks
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "prototype can read support history"
  on public.support_history
  for select
  to anon, authenticated
  using (true);

create policy "prototype can write support history"
  on public.support_history
  for all
  to anon, authenticated
  using (true)
  with check (true);
