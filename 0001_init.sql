-- Site Secretary — initial schema
-- Apply via: supabase db push  (or paste into Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ============================================================
-- Catalogs
-- ============================================================

create table activities (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name_en     text not null,
  name_ar     text not null,
  sort_order  int not null default 0
);

create table equipment (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name_en     text not null,
  name_ar     text not null,
  sort_order  int not null default 0
);

create table welfare_items (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name_en     text not null,
  name_ar     text not null,
  sort_order  int not null default 0
);

-- ============================================================
-- Project hierarchy
-- ============================================================

create table projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create type alignment_kind as enum ('alignment', 'laydown', 'pumping_station');

create table alignments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  kind        alignment_kind not null default 'alignment',
  code        text not null,
  name_en     text not null,
  name_ar     text not null,
  sort_order  int not null default 0,
  unique (project_id, code)
);

create table sections (
  id            uuid primary key default gen_random_uuid(),
  alignment_id  uuid not null references alignments(id) on delete cascade,
  number        int not null,
  km_start_m    int not null,
  km_end_m      int not null,
  unique (alignment_id, number)
);

create table kilometer_marks (
  id            uuid primary key default gen_random_uuid(),
  alignment_id  uuid not null references alignments(id) on delete cascade,
  km_m          int not null,
  latitude      double precision,
  longitude     double precision,
  unique (alignment_id, km_m)
);

-- ============================================================
-- People
-- ============================================================

create type person_company as enum ('petrojet', 'subcontractor', 'client', 'other');
create type person_role    as enum ('construction_engineer', 'safety_engineer', 'subcon_rep', 'subcon_engineer', 'subcon_safety', 'other');

create table people (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  section_id   uuid references sections(id) on delete set null,
  full_name    text not null,
  role         person_role not null,
  company      person_company not null default 'petrojet',
  subcon_name  text,
  phone        text,
  email        text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- Notes / Issues / Incidents / Events / Audits — the core
-- ============================================================

create type note_kind   as enum ('note', 'issue', 'incident', 'event', 'audit', 'progress', 'challenge');
create type note_status as enum ('open', 'in_progress', 'blocked', 'resolved', 'closed', 'cancelled');

create table notes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  section_id      uuid references sections(id) on delete set null,
  km_from_m       int,
  km_to_m         int,
  kind            note_kind not null default 'note',
  current_status  note_status not null default 'open',
  title           text not null,
  body            text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on notes (project_id, current_status, kind);
create index on notes (section_id);

create table note_status_history (
  id           uuid primary key default gen_random_uuid(),
  note_id      uuid not null references notes(id) on delete cascade,
  changed_by   uuid not null references auth.users(id),
  from_status  note_status,
  to_status    note_status not null,
  note         text,
  changed_at   timestamptz not null default now()
);

create index on note_status_history (note_id, changed_at desc);

create table note_tags (
  note_id          uuid not null references notes(id) on delete cascade,
  activity_id      uuid references activities(id) on delete cascade,
  equipment_id     uuid references equipment(id) on delete cascade,
  welfare_item_id  uuid references welfare_items(id) on delete cascade,
  check (
    (activity_id is not null)::int +
    (equipment_id is not null)::int +
    (welfare_item_id is not null)::int = 1
  )
);

create unique index note_tags_activity_unique  on note_tags (note_id, activity_id)     where activity_id is not null;
create unique index note_tags_equipment_unique on note_tags (note_id, equipment_id)    where equipment_id is not null;
create unique index note_tags_welfare_unique   on note_tags (note_id, welfare_item_id) where welfare_item_id is not null;

create table attachments (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references notes(id) on delete cascade,
  storage_path text not null,
  mime_type   text,
  bytes       int,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Triggers
-- ============================================================

create or replace function touch_notes_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger notes_touch
  before update on notes
  for each row execute function touch_notes_updated_at();

-- Auto-log first row in history when a note is created
create or replace function log_note_creation() returns trigger language plpgsql as $$
begin
  insert into note_status_history (note_id, changed_by, from_status, to_status, note)
  values (new.id, new.owner_id, null, new.current_status, 'created');
  return new;
end $$;

create trigger notes_log_creation
  after insert on notes
  for each row execute function log_note_creation();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table projects             enable row level security;
alter table alignments           enable row level security;
alter table sections             enable row level security;
alter table kilometer_marks      enable row level security;
alter table people               enable row level security;
alter table notes                enable row level security;
alter table note_status_history  enable row level security;
alter table note_tags            enable row level security;
alter table attachments          enable row level security;
alter table activities           enable row level security;
alter table equipment            enable row level security;
alter table welfare_items        enable row level security;

-- Catalogs are readable by any authenticated user
create policy catalog_select_activities on activities for select to authenticated using (true);
create policy catalog_select_equipment  on equipment  for select to authenticated using (true);
create policy catalog_select_welfare    on welfare_items for select to authenticated using (true);

-- Project ownership policy
create policy projects_own on projects
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Hierarchy: visible if parent project is owned by user
create policy alignments_own on alignments
  for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy sections_own on sections
  for all to authenticated
  using (exists (select 1 from alignments a join projects p on p.id = a.project_id where a.id = alignment_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from alignments a join projects p on p.id = a.project_id where a.id = alignment_id and p.owner_id = auth.uid()));

create policy km_marks_own on kilometer_marks
  for all to authenticated
  using (exists (select 1 from alignments a join projects p on p.id = a.project_id where a.id = alignment_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from alignments a join projects p on p.id = a.project_id where a.id = alignment_id and p.owner_id = auth.uid()));

create policy people_own on people
  for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

-- Notes owned by the user directly
create policy notes_own on notes
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy note_history_own on note_status_history
  for all to authenticated
  using (exists (select 1 from notes n where n.id = note_id and n.owner_id = auth.uid()))
  with check (changed_by = auth.uid());

create policy note_tags_own on note_tags
  for all to authenticated
  using (exists (select 1 from notes n where n.id = note_id and n.owner_id = auth.uid()))
  with check (exists (select 1 from notes n where n.id = note_id and n.owner_id = auth.uid()));

create policy attachments_own on attachments
  for all to authenticated
  using (exists (select 1 from notes n where n.id = note_id and n.owner_id = auth.uid()))
  with check (exists (select 1 from notes n where n.id = note_id and n.owner_id = auth.uid()));
