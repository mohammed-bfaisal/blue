-- ================================================================
-- BLUE SYSTEM — SUPABASE DATABASE SCHEMA
-- Run this in the Supabase SQL editor in order.
-- ================================================================

-- ── EXTENSIONS ──────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- full-text trigram search
create extension if not exists "unaccent";  -- accent-insensitive search

-- ── ENUMS ───────────────────────────────────────────────────────
create type user_role       as enum ('user', 'verifier', 'admin');
create type guide_status    as enum ('draft','pending_review','in_review','approved','rejected','appealed','spinoff');
create type vote_decision   as enum ('approve','reject');
create type dispute_status  as enum ('open','resolved','dismissed');
create type dispute_result  as enum ('spinoff','keep','move');
create type appeal_status   as enum ('pending','approved','rejected');
create type notif_type      as enum (
  'submission_received','verification_assigned','vote_cast',
  'guide_approved','guide_rejected','appeal_opened','appeal_resolved',
  'dispute_opened','dispute_resolved','standing_warning','verifier_qualified'
);

-- ── USERS ───────────────────────────────────────────────────────
-- Extends Supabase Auth (auth.users) with app-level profile data
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null check (length(username) between 3 and 30),
  avatar_url    text,
  role          user_role not null default 'user',
  standing      integer not null default 100 check (standing between 0 and 100),
  strikes       integer not null default 0 check (strikes >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── NICHES ──────────────────────────────────────────────────────
create table public.niches (
  id            uuid primary key default uuid_generate_v4(),
  name          text unique not null,
  slug          text unique not null,
  description   text not null default '',
  guide_count   integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ── GUIDES ──────────────────────────────────────────────────────
create table public.guides (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null check (length(title) between 5 and 200),
  description   text not null check (length(description) between 20 and 500),
  niche_id      uuid not null references public.niches(id),
  level         smallint not null check (level between 1 and 4),
  status        guide_status not null default 'draft',
  author_id     uuid not null references public.profiles(id),
  content       text not null default '',           -- markdown body
  tags          text[] not null default '{}',
  upvotes       integer not null default 0,
  verifier_count integer not null default 0,
  parent_id     uuid references public.guides(id),  -- for spinoffs
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Full-text search vector (auto-maintained by trigger)
  search_vector tsvector
);

-- Prerequisites: many-to-many guide → guide
create table public.guide_prerequisites (
  guide_id      uuid not null references public.guides(id) on delete cascade,
  requires_id   uuid not null references public.guides(id) on delete cascade,
  primary key (guide_id, requires_id),
  check (guide_id <> requires_id)
);

-- Methods: each guide can have multiple methods
create table public.methods (
  id            uuid primary key default uuid_generate_v4(),
  guide_id      uuid not null references public.guides(id) on delete cascade,
  title         text not null,
  description   text not null default '',
  steps         text[] not null default '{}',
  sort_order    smallint not null default 0
);

-- Materials: per-guide materials list
create table public.materials (
  id            uuid primary key default uuid_generate_v4(),
  guide_id      uuid not null references public.guides(id) on delete cascade,
  method_id     uuid references public.methods(id) on delete set null,
  name          text not null,
  description   text not null default '',
  optional      boolean not null default false,
  affiliate_url text,
  rating        numeric(3,2) check (rating between 0 and 5),
  sort_order    smallint not null default 0
);

-- ── VERIFIER QUALIFICATIONS ─────────────────────────────────────
create table public.verifier_qualifications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  niche_id      uuid not null references public.niches(id),
  level         smallint not null check (level between 1 and 4),
  test_score    numeric(5,2) not null check (test_score between 0 and 100),
  qualified_at  timestamptz not null default now(),
  unique (user_id, niche_id, level)
);

-- ── VERIFICATION SESSIONS ───────────────────────────────────────
create table public.verification_sessions (
  id            uuid primary key default uuid_generate_v4(),
  guide_id      uuid not null references public.guides(id) on delete cascade,
  outcome       vote_decision,
  resolved_at   timestamptz,
  deadline      timestamptz not null,
  created_at    timestamptz not null default now()
);

-- Verifier assignments per session
create table public.session_verifiers (
  session_id    uuid not null references public.verification_sessions(id) on delete cascade,
  verifier_id   uuid not null references public.profiles(id),
  primary key (session_id, verifier_id)
);

-- Votes cast within a session
create table public.votes (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references public.verification_sessions(id) on delete cascade,
  verifier_id   uuid not null references public.profiles(id),
  decision      vote_decision not null,
  reasoning     text not null check (length(reasoning) >= 100),
  niche_note    text,     -- if verifier suggests different niche
  level_note    smallint, -- if verifier suggests different level
  created_at    timestamptz not null default now(),
  unique (session_id, verifier_id)
);

-- ── UPVOTES ─────────────────────────────────────────────────────
create table public.guide_upvotes (
  guide_id      uuid not null references public.guides(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (guide_id, user_id)
);

-- ── APPEALS ─────────────────────────────────────────────────────
create table public.appeals (
  id            uuid primary key default uuid_generate_v4(),
  guide_id      uuid not null references public.guides(id) on delete cascade,
  author_id     uuid not null references public.profiles(id),
  reason        text not null check (length(reason) >= 50),
  status        appeal_status not null default 'pending',
  reviewed_by   uuid references public.profiles(id),
  review_note   text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  -- One appeal per guide per author
  unique (guide_id, author_id)
);

-- ── DISPUTES ────────────────────────────────────────────────────
create table public.disputes (
  id            uuid primary key default uuid_generate_v4(),
  guide_id      uuid not null references public.guides(id) on delete cascade,
  opener_id     uuid not null references public.profiles(id),
  reason        text not null check (length(reason) >= 50),
  status        dispute_status not null default 'open',
  vote_result   dispute_result,
  resolution    text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

-- ── NOTIFICATIONS ────────────────────────────────────────────────
create table public.notifications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          notif_type not null,
  title         text not null,
  body          text not null,
  read          boolean not null default false,
  link          text,
  meta          jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- ================================================================
-- INDEXES
-- ================================================================

-- Guides
create index guides_niche_id_idx      on public.guides(niche_id);
create index guides_level_idx         on public.guides(level);
create index guides_status_idx        on public.guides(status);
create index guides_author_id_idx     on public.guides(author_id);
create index guides_search_vector_idx on public.guides using gin(search_vector);
create index guides_tags_idx          on public.guides using gin(tags);
create index guides_created_at_idx    on public.guides(created_at desc);

-- Verifier qualifications
create index vq_user_id_idx           on public.verifier_qualifications(user_id);
create index vq_niche_level_idx       on public.verifier_qualifications(niche_id, level);

-- Notifications
create index notif_user_id_idx        on public.notifications(user_id, created_at desc);
create index notif_unread_idx         on public.notifications(user_id, read) where read = false;

-- Votes
create index votes_session_id_idx     on public.votes(session_id);

-- ================================================================
-- FULL-TEXT SEARCH TRIGGER
-- ================================================================

create or replace function update_guide_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.content, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'B');
  return new;
end;
$$;

create trigger guide_search_vector_update
  before insert or update on public.guides
  for each row execute function update_guide_search_vector();

-- ================================================================
-- UPDATED_AT TRIGGERS
-- ================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_guides_updated_at
  before update on public.guides
  for each row execute function set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function set_updated_at();

-- ================================================================
-- UPVOTE COUNTER (denormalized for performance)
-- ================================================================

create or replace function sync_guide_upvote_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.guides set upvotes = upvotes + 1 where id = new.guide_id;
  elsif TG_OP = 'DELETE' then
    update public.guides set upvotes = upvotes - 1 where id = old.guide_id;
  end if;
  return null;
end;
$$;

create trigger guide_upvote_counter
  after insert or delete on public.guide_upvotes
  for each row execute function sync_guide_upvote_count();

-- ================================================================
-- NICHE GUIDE COUNTER
-- ================================================================

create or replace function sync_niche_guide_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' and new.status = 'approved' then
    update public.niches set guide_count = guide_count + 1 where id = new.niche_id;
  elsif TG_OP = 'UPDATE' then
    if old.status <> 'approved' and new.status = 'approved' then
      update public.niches set guide_count = guide_count + 1 where id = new.niche_id;
    elsif old.status = 'approved' and new.status <> 'approved' then
      update public.niches set guide_count = guide_count - 1 where id = new.niche_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger niche_guide_counter
  after insert or update on public.guides
  for each row execute function sync_niche_guide_count();

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

alter table public.profiles               enable row level security;
alter table public.guides                 enable row level security;
alter table public.guide_prerequisites    enable row level security;
alter table public.methods                enable row level security;
alter table public.materials              enable row level security;
alter table public.verifier_qualifications enable row level security;
alter table public.verification_sessions  enable row level security;
alter table public.session_verifiers      enable row level security;
alter table public.votes                  enable row level security;
alter table public.guide_upvotes          enable row level security;
alter table public.appeals                enable row level security;
alter table public.disputes               enable row level security;
alter table public.notifications          enable row level security;
alter table public.niches                 enable row level security;

-- Profiles: public read, own write
create policy "profiles_public_read"   on public.profiles for select using (true);
create policy "profiles_own_insert"    on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_own_update"    on public.profiles for update using (auth.uid() = id);

-- Niches: public read, admin write
create policy "niches_public_read"     on public.niches for select using (true);
create policy "niches_admin_write"     on public.niches for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Guides: approved guides are public; drafts only visible to author
create policy "guides_approved_read"   on public.guides for select using (
  status = 'approved' or author_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "guides_author_insert"   on public.guides for insert with check (auth.uid() = author_id);
create policy "guides_author_update"   on public.guides for update using (
  auth.uid() = author_id and status = 'draft'
);
create policy "guides_admin_update"    on public.guides for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','verifier'))
);

-- Methods + Materials: follow guide visibility
create policy "methods_read"           on public.methods for select using (
  exists (select 1 from public.guides g where g.id = guide_id and (g.status = 'approved' or g.author_id = auth.uid()))
);
create policy "methods_author_write"   on public.methods for all using (
  exists (select 1 from public.guides g where g.id = guide_id and g.author_id = auth.uid())
);

create policy "materials_read"         on public.materials for select using (
  exists (select 1 from public.guides g where g.id = guide_id and (g.status = 'approved' or g.author_id = auth.uid()))
);
create policy "materials_author_write" on public.materials for all using (
  exists (select 1 from public.guides g where g.id = guide_id and g.author_id = auth.uid())
);

-- Prerequisites: public read for approved guides
create policy "prereqs_read"           on public.guide_prerequisites for select using (true);
create policy "prereqs_author_write"   on public.guide_prerequisites for all using (
  exists (select 1 from public.guides g where g.id = guide_id and g.author_id = auth.uid())
);

-- Verifier qualifications: own read
create policy "vq_own_read"            on public.verifier_qualifications for select using (auth.uid() = user_id);
create policy "vq_admin_all"           on public.verifier_qualifications for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Verification sessions: verifier read own, admin all
create policy "sessions_verifier_read" on public.verification_sessions for select using (
  exists (select 1 from public.session_verifiers sv where sv.session_id = id and sv.verifier_id = auth.uid())
  or exists (select 1 from public.guides g where g.id = guide_id and g.author_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Votes: own read/write, session participants can see all votes after resolution
create policy "votes_own_write"        on public.votes for insert with check (auth.uid() = verifier_id);
create policy "votes_read"             on public.votes for select using (
  auth.uid() = verifier_id or
  exists (select 1 from public.verification_sessions vs where vs.id = session_id and vs.resolved_at is not null
    and exists (select 1 from public.guides g where g.id = vs.guide_id and g.author_id = auth.uid()))
);

-- Upvotes: public read, own write
create policy "upvotes_public_read"    on public.guide_upvotes for select using (true);
create policy "upvotes_own_write"      on public.guide_upvotes for insert with check (auth.uid() = user_id);
create policy "upvotes_own_delete"     on public.guide_upvotes for delete using (auth.uid() = user_id);

-- Appeals: own read/write
create policy "appeals_own_read"       on public.appeals for select using (auth.uid() = author_id);
create policy "appeals_own_write"      on public.appeals for insert with check (auth.uid() = author_id);
create policy "appeals_admin_all"      on public.appeals for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Disputes: any authenticated user can read; own write
create policy "disputes_auth_read"     on public.disputes for select using (auth.uid() is not null);
create policy "disputes_auth_write"    on public.disputes for insert with check (auth.uid() = opener_id);
create policy "disputes_admin_update"  on public.disputes for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Notifications: own only
create policy "notif_own"              on public.notifications for all using (auth.uid() = user_id);

-- ================================================================
-- SEED DATA
-- ================================================================

insert into public.niches (name, slug, description) values
  ('Electronics',  'electronics',  'Circuits, components, embedded systems'),
  ('Medicine',     'medicine',     'Clinical practice, diagnostics, pharmacology'),
  ('Construction', 'construction', 'Structural work, materials, trades'),
  ('Mathematics',  'mathematics',  'Pure and applied mathematical systems'),
  ('Mechanics',    'mechanics',    'Engines, drivetrains, mechanical systems'),
  ('Chemistry',    'chemistry',    'Reactions, synthesis, lab technique'),
  ('Programming',  'programming',  'Software systems, algorithms, architecture'),
  ('Agriculture',  'agriculture',  'Farming, soil, irrigation, crops');
