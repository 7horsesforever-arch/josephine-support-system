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
  category text not null check (category in ('school', 'communications', 'financial', 'housing', 'admin', 'health', 'life')),
  description text not null default '',
  normal_interval_days integer not null check (normal_interval_days > 0),
  max_gap_days integer not null check (max_gap_days >= normal_interval_days),
  last_completed_at timestamptz not null,
  status text not null default 'ok' check (status in ('ok', 'due', 'snoozed', 'needs_help', 'escalated')),
  updated_at timestamptz not null default now()
);

update public.support_tasks
set category = 'health'
where category = 'hygiene';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'support_tasks_category_check'
  ) then
    alter table public.support_tasks drop constraint support_tasks_category_check;
  end if;

  alter table public.support_tasks
    add constraint support_tasks_category_check
    check (category in ('school', 'communications', 'financial', 'housing', 'admin', 'health', 'life'));
end $$;

create table if not exists public.support_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text references public.support_tasks(id) on delete set null,
  task_title text not null,
  action_type text not null check (action_type in ('done', 'already_did_it', 'snooze', 'need_help', 'created')),
  created_at timestamptz not null default now()
);

create table if not exists public.school_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'canvas' check (source in ('canvas')),
  source_course_id text not null,
  source_assignment_id text not null,
  course_name text not null,
  title text not null,
  due_at timestamptz,
  url text,
  points_possible numeric,
  workflow_state text,
  imported_at timestamptz not null default now(),
  unique (user_id, source, source_course_id, source_assignment_id)
);

create table if not exists public.canvas_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  canvas_base_url text not null,
  encrypted_access_token text not null,
  token_iv text not null,
  token_auth_tag text not null,
  expires_at timestamptz not null,
  last_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.housing_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  document_type text not null default 'other' check (document_type in ('contract', 'move_in', 'billing', 'maintenance', 'policy', 'other')),
  status text not null default 'stored' check (status in ('stored', 'needs_review', 'expires_soon', 'archived')),
  storage_path text,
  file_url text,
  important_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_email_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'microsoft_graph' check (source in ('microsoft_graph', 'google_gmail')),
  source_message_id text not null,
  sender_name text,
  sender_email text,
  subject text not null,
  body_preview text,
  received_at timestamptz,
  web_url text,
  importance text,
  is_read boolean,
  imported_at timestamptz not null default now(),
  unique (user_id, source, source_message_id)
);

create table if not exists public.school_email_triage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'microsoft_graph' check (source in ('microsoft_graph', 'google_gmail')),
  source_message_id text not null,
  priority text not null check (priority in ('low', 'normal', 'high', 'urgent')),
  category text not null check (category in ('deadline', 'meeting', 'admin', 'coursework', 'support', 'other')),
  summary text not null,
  suggested_action text not null,
  due_hint text,
  created_at timestamptz not null default now(),
  unique (user_id, source, source_message_id)
);

create table if not exists public.school_email_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'microsoft_graph' check (source in ('microsoft_graph', 'google_gmail')),
  source_message_id text not null,
  recipient_email text,
  subject text not null,
  body text not null,
  status text not null default 'needs_review' check (status in ('needs_review', 'edited', 'approved', 'sent', 'discarded')),
  created_by_agent text not null default 'communications_drafting_agent_v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_message_id)
);

alter table public.school_email_messages
  drop constraint if exists school_email_messages_source_check;

alter table public.school_email_messages
  add constraint school_email_messages_source_check
  check (source in ('microsoft_graph', 'google_gmail'));

alter table public.school_email_triage
  add column if not exists source text not null default 'microsoft_graph';

alter table public.school_email_triage
  drop constraint if exists school_email_triage_source_check;

alter table public.school_email_triage
  add constraint school_email_triage_source_check
  check (source in ('microsoft_graph', 'google_gmail'));

alter table public.school_email_triage
  drop constraint if exists school_email_triage_user_id_source_message_id_key;

alter table public.school_email_triage
  drop constraint if exists school_email_triage_user_id_source_source_message_id_key;

alter table public.school_email_triage
  add constraint school_email_triage_user_id_source_source_message_id_key
  unique (user_id, source, source_message_id);

create index if not exists support_tasks_assigned_user_id_idx on public.support_tasks(assigned_user_id);
create index if not exists support_tasks_created_by_idx on public.support_tasks(created_by);
create index if not exists support_tasks_status_idx on public.support_tasks(status);
create index if not exists support_history_user_id_created_at_idx on public.support_history(user_id, created_at desc);
create index if not exists school_assignments_user_id_due_at_idx on public.school_assignments(user_id, due_at);
create index if not exists canvas_connections_expires_at_idx on public.canvas_connections(expires_at);
create index if not exists housing_documents_user_id_important_date_idx on public.housing_documents(user_id, important_date);
create index if not exists housing_documents_user_id_status_idx on public.housing_documents(user_id, status, updated_at desc);
create index if not exists school_email_messages_user_id_received_at_idx on public.school_email_messages(user_id, received_at desc);
create index if not exists school_email_messages_user_id_source_received_at_idx on public.school_email_messages(user_id, source, received_at desc);
create index if not exists school_email_triage_user_id_priority_idx on public.school_email_triage(user_id, priority, created_at desc);
create index if not exists school_email_triage_user_id_source_priority_idx on public.school_email_triage(user_id, source, priority, created_at desc);
create index if not exists school_email_drafts_user_id_updated_at_idx on public.school_email_drafts(user_id, updated_at desc);
create index if not exists school_email_drafts_user_id_status_idx on public.school_email_drafts(user_id, status, updated_at desc);
create index if not exists caregiver_links_student_user_id_idx on public.caregiver_links(student_user_id);
create index if not exists caregiver_links_caregiver_user_id_idx on public.caregiver_links(caregiver_user_id);

alter table public.profiles enable row level security;
alter table public.caregiver_links enable row level security;
alter table public.support_tasks enable row level security;
alter table public.support_history enable row level security;
alter table public.school_assignments enable row level security;
alter table public.canvas_connections enable row level security;
alter table public.housing_documents enable row level security;
alter table public.school_email_messages enable row level security;
alter table public.school_email_triage enable row level security;
alter table public.school_email_drafts enable row level security;

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
drop policy if exists "Users can read own school assignments" on public.school_assignments;
drop policy if exists "Users can write own school assignments" on public.school_assignments;
drop policy if exists "Users can delete own school assignments" on public.school_assignments;
drop policy if exists "Users can read own Canvas connection" on public.canvas_connections;
drop policy if exists "Users can write own Canvas connection" on public.canvas_connections;
drop policy if exists "Users can delete own Canvas connection" on public.canvas_connections;
drop policy if exists "Users can read own housing documents" on public.housing_documents;
drop policy if exists "Users can write own housing documents" on public.housing_documents;
drop policy if exists "Users can delete own housing documents" on public.housing_documents;
drop policy if exists "Users can read own school email messages" on public.school_email_messages;
drop policy if exists "Users can write own school email messages" on public.school_email_messages;
drop policy if exists "Users can delete own school email messages" on public.school_email_messages;
drop policy if exists "Users can read own school email triage" on public.school_email_triage;
drop policy if exists "Users can write own school email triage" on public.school_email_triage;
drop policy if exists "Users can delete own school email triage" on public.school_email_triage;
drop policy if exists "Users can read own school email drafts" on public.school_email_drafts;
drop policy if exists "Users can write own school email drafts" on public.school_email_drafts;
drop policy if exists "Users can delete own school email drafts" on public.school_email_drafts;

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

create policy "Users can read own school assignments"
  on public.school_assignments
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.caregiver_links
      where caregiver_links.student_user_id = school_assignments.user_id
        and caregiver_links.caregiver_user_id = (select auth.uid())
    )
  );

create policy "Users can write own school assignments"
  on public.school_assignments
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete own school assignments"
  on public.school_assignments
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read own Canvas connection"
  on public.canvas_connections
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can write own Canvas connection"
  on public.canvas_connections
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete own Canvas connection"
  on public.canvas_connections
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read own housing documents"
  on public.housing_documents
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.caregiver_links
      where caregiver_links.student_user_id = housing_documents.user_id
        and caregiver_links.caregiver_user_id = (select auth.uid())
    )
  );

create policy "Users can write own housing documents"
  on public.housing_documents
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete own housing documents"
  on public.housing_documents
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read own school email messages"
  on public.school_email_messages
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.caregiver_links
      where caregiver_links.student_user_id = school_email_messages.user_id
        and caregiver_links.caregiver_user_id = (select auth.uid())
    )
  );

create policy "Users can write own school email messages"
  on public.school_email_messages
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete own school email messages"
  on public.school_email_messages
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read own school email triage"
  on public.school_email_triage
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.caregiver_links
      where caregiver_links.student_user_id = school_email_triage.user_id
        and caregiver_links.caregiver_user_id = (select auth.uid())
    )
  );

create policy "Users can write own school email triage"
  on public.school_email_triage
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete own school email triage"
  on public.school_email_triage
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read own school email drafts"
  on public.school_email_drafts
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.caregiver_links
      where caregiver_links.student_user_id = school_email_drafts.user_id
        and caregiver_links.caregiver_user_id = (select auth.uid())
    )
  );

create policy "Users can write own school email drafts"
  on public.school_email_drafts
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete own school email drafts"
  on public.school_email_drafts
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
