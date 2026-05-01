create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Josephine',
  role text not null default 'student' check (role in ('student', 'caregiver', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caregiver_links (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references auth.users(id) on delete cascade,
  caregiver_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_user_id, caregiver_user_id)
);

create table if not exists public.support_tasks (
  id text primary key,
  assigned_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text references public.support_tasks(id) on delete set null,
  task_title text not null,
  action_type text not null check (action_type in ('done', 'already_did_it', 'snooze', 'need_help', 'created')),
  created_at timestamptz not null default now()
);

create index if not exists support_tasks_assigned_user_id_idx on public.support_tasks(assigned_user_id);
create index if not exists support_tasks_created_by_idx on public.support_tasks(created_by);
create index if not exists support_tasks_status_idx on public.support_tasks(status);
create index if not exists support_history_user_id_created_at_idx on public.support_history(user_id, created_at desc);
create index if not exists caregiver_links_student_user_id_idx on public.caregiver_links(student_user_id);
create index if not exists caregiver_links_caregiver_user_id_idx on public.caregiver_links(caregiver_user_id);

alter table public.profiles enable row level security;
alter table public.caregiver_links enable row level security;
alter table public.support_tasks enable row level security;
alter table public.support_history enable row level security;

drop policy if exists "prototype can read support tasks" on public.support_tasks;
drop policy if exists "prototype can write support tasks" on public.support_tasks;
drop policy if exists "prototype can read support history" on public.support_history;
drop policy if exists "prototype can write support history" on public.support_history;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can write own profile" on public.profiles;
drop policy if exists "Users can read own caregiver links" on public.caregiver_links;
drop policy if exists "Users can read assigned support tasks" on public.support_tasks;
drop policy if exists "Users can create own support tasks" on public.support_tasks;
drop policy if exists "Users can update assigned support tasks" on public.support_tasks;
drop policy if exists "Users can delete assigned support tasks" on public.support_tasks;
drop policy if exists "Users can read own support history" on public.support_history;
drop policy if exists "Users can create own support history" on public.support_history;
drop policy if exists "Users can delete own support history" on public.support_history;

create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users can write own profile"
  on public.profiles
  for all
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users can read own caregiver links"
  on public.caregiver_links
  for select
  to authenticated
  using (
    student_user_id = (select auth.uid())
    or caregiver_user_id = (select auth.uid())
  );

create policy "Users can read assigned support tasks"
  on public.support_tasks
  for select
  to authenticated
  using (
    assigned_user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or exists (
      select 1
      from public.caregiver_links
      where caregiver_links.student_user_id = support_tasks.assigned_user_id
        and caregiver_links.caregiver_user_id = (select auth.uid())
    )
  );

create policy "Users can create own support tasks"
  on public.support_tasks
  for insert
  to authenticated
  with check (
    assigned_user_id = (select auth.uid())
    and created_by = (select auth.uid())
  );

create policy "Users can update assigned support tasks"
  on public.support_tasks
  for update
  to authenticated
  using (
    assigned_user_id = (select auth.uid())
    or created_by = (select auth.uid())
  )
  with check (
    assigned_user_id = (select auth.uid())
    or created_by = (select auth.uid())
  );

create policy "Users can delete assigned support tasks"
  on public.support_tasks
  for delete
  to authenticated
  using (
    assigned_user_id = (select auth.uid())
    or created_by = (select auth.uid())
  );

create policy "Users can read own support history"
  on public.support_history
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.caregiver_links
      where caregiver_links.student_user_id = support_history.user_id
        and caregiver_links.caregiver_user_id = (select auth.uid())
    )
  );

create policy "Users can create own support history"
  on public.support_history
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can delete own support history"
  on public.support_history
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
