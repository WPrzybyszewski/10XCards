-- migration: init flashcards schema for fiszki ai mvp
-- purpose:
--   - create core domain tables for categories, flashcards, generations,
--     generation_proposals and generation_error_logs
--   - enforce ownership via user_id referencing auth.users
--   - enable row level security (rls) on all user-scoped tables
--   - define granular rls policies for anon and authenticated roles
--   - add triggers for updated_at and category reassignment
-- notes:
--   - all table and column names use snake_case
--   - all sql is written in lowercase
--   - destructive actions (drops) are not included in this migration

-- ensure required extension for uuid generation
create extension if not exists "pgcrypto";

---------------------------------------
-- 1. categories
---------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_empty check (length(trim(name)) > 0),
  constraint categories_user_id_name_key unique (user_id, name)
);

-- enable rls on categories
alter table public.categories enable row level security;

-- rls policies for categories

-- authenticated users: select own categories
create policy categories_select_own_authenticated
on public.categories
for select
to authenticated
using (user_id = auth.uid());

-- authenticated users: insert own categories
create policy categories_insert_own_authenticated
on public.categories
for insert
to authenticated
with check (user_id = auth.uid());

-- authenticated users: update own categories
create policy categories_update_own_authenticated
on public.categories
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- authenticated users: delete own categories
create policy categories_delete_own_authenticated
on public.categories
for delete
to authenticated
using (user_id = auth.uid());

-- anon users: no access to categories (deny by always-false predicate)
create policy categories_select_none_anon
on public.categories
for select
to anon
using (false);

create policy categories_insert_none_anon
on public.categories
for insert
to anon
with check (false);

create policy categories_update_none_anon
on public.categories
for update
to anon
using (false)
with check (false);

create policy categories_delete_none_anon
on public.categories
for delete
to anon
using (false);

-- indexes for categories
create unique index if not exists categories_user_id_name_key
  on public.categories (user_id, name);

create index if not exists categories_user_id_created_at_idx
  on public.categories (user_id, created_at desc);

---------------------------------------
-- 2. flashcards
---------------------------------------

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  front varchar(200) not null,
  back varchar(500) not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flashcards_front_not_empty check (length(trim(front)) > 0),
  constraint flashcards_back_not_empty check (length(trim(back)) > 0),
  constraint flashcards_source_valid check (source in ('manual', 'ai'))
);

-- enable rls on flashcards
alter table public.flashcards enable row level security;

-- rls policies for flashcards

-- authenticated users: select own flashcards
create policy flashcards_select_own_authenticated
on public.flashcards
for select
to authenticated
using (user_id = auth.uid());

-- authenticated users: insert own flashcards
create policy flashcards_insert_own_authenticated
on public.flashcards
for insert
to authenticated
with check (user_id = auth.uid());

-- authenticated users: update own flashcards
create policy flashcards_update_own_authenticated
on public.flashcards
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- authenticated users: delete own flashcards
create policy flashcards_delete_own_authenticated
on public.flashcards
for delete
to authenticated
using (user_id = auth.uid());

-- anon users: no access to flashcards
create policy flashcards_select_none_anon
on public.flashcards
for select
to anon
using (false);

create policy flashcards_insert_none_anon
on public.flashcards
for insert
to anon
with check (false);

create policy flashcards_update_none_anon
on public.flashcards
for update
to anon
using (false)
with check (false);

create policy flashcards_delete_none_anon
on public.flashcards
for delete
to anon
using (false);

-- indexes for flashcards
create index if not exists flashcards_user_id_created_at_idx
  on public.flashcards (user_id, created_at desc);

create index if not exists flashcards_user_id_category_id_idx
  on public.flashcards (user_id, category_id);

---------------------------------------
-- 3. generations (successful only)
---------------------------------------

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input text not null,
  created_at timestamptz not null default now()
);

-- enable rls on generations
alter table public.generations enable row level security;

-- rls policies for generations

-- authenticated users: select own generations
create policy generations_select_own_authenticated
on public.generations
for select
to authenticated
using (user_id = auth.uid());

-- authenticated users: insert own generations
create policy generations_insert_own_authenticated
on public.generations
for insert
to authenticated
with check (user_id = auth.uid());

-- anon users: no access to generations
create policy generations_select_none_anon
on public.generations
for select
to anon
using (false);

create policy generations_insert_none_anon
on public.generations
for insert
to anon
with check (false);

-- indexes for generations
create index if not exists generations_user_id_created_at_idx
  on public.generations (user_id, created_at desc);

---------------------------------------
-- 4. generation_proposals
---------------------------------------

create table if not exists public.generation_proposals (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations (id) on delete cascade,
  index smallint not null,
  front varchar(200) not null,
  back varchar(500) not null,
  flashcard_id uuid null references public.flashcards (id) on delete set null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint generation_proposals_index_range check (index between 0 and 2),
  constraint generation_proposals_front_not_empty check (length(trim(front)) > 0),
  constraint generation_proposals_back_not_empty check (length(trim(back)) > 0),
  constraint generation_proposals_generation_id_index_key unique (generation_id, index)
);

-- enable rls on generation_proposals
alter table public.generation_proposals enable row level security;

-- rls policies for generation_proposals

-- authenticated users: select proposals of their own generations
create policy generation_proposals_select_own_authenticated
on public.generation_proposals
for select
to authenticated
using (
  exists (
    select 1
    from public.generations g
    where g.id = generation_proposals.generation_id
      and g.user_id = auth.uid()
  )
);

-- authenticated users: update proposals of their own generations
-- (e.g. to mark acceptance and link flashcard_id)
create policy generation_proposals_update_own_authenticated
on public.generation_proposals
for update
to authenticated
using (
  exists (
    select 1
    from public.generations g
    where g.id = generation_proposals.generation_id
      and g.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.generations g
    where g.id = generation_proposals.generation_id
      and g.user_id = auth.uid()
  )
);

-- anon users: no access to generation_proposals
create policy generation_proposals_select_none_anon
on public.generation_proposals
for select
to anon
using (false);

create policy generation_proposals_update_none_anon
on public.generation_proposals
for update
to anon
using (false)
with check (false);

-- inserts into generation_proposals are expected to be performed
-- by backend / service_role only after successful ai generation.

-- indexes for generation_proposals
create unique index if not exists generation_proposals_generation_id_index_key
  on public.generation_proposals (generation_id, index);

create index if not exists generation_proposals_generation_id_idx
  on public.generation_proposals (generation_id);

---------------------------------------
-- 5. generation_error_logs
---------------------------------------

create table if not exists public.generation_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  generation_id uuid null references public.generations (id) on delete set null,
  error_code text null,
  error_message text not null,
  created_at timestamptz not null default now()
);

-- enable rls on generation_error_logs
alter table public.generation_error_logs enable row level security;

-- rls policies for generation_error_logs

-- authenticated users: select own error logs
create policy generation_error_logs_select_own_authenticated
on public.generation_error_logs
for select
to authenticated
using (user_id = auth.uid());

-- anon users: no access to error logs
create policy generation_error_logs_select_none_anon
on public.generation_error_logs
for select
to anon
using (false);

-- inserts into generation_error_logs should be performed by backend /
-- service_role only (no policies for authenticated/anon inserts needed).

-- indexes for generation_error_logs
create index if not exists generation_error_logs_user_id_created_at_idx
  on public.generation_error_logs (user_id, created_at desc);

create index if not exists generation_error_logs_generation_id_idx
  on public.generation_error_logs (generation_id);

---------------------------------------
-- 6. triggers
---------------------------------------

-- trigger function to keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- apply updated_at trigger to categories and flashcards
create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger flashcards_set_updated_at
before update on public.flashcards
for each row
execute function public.set_updated_at();

-- trigger function to reassign flashcards when a category is deleted
-- warning:
--   this function assumes that for each user there is at most one category
--   named 'inne'. if none exists, it creates one automatically.

create or replace function public.reassign_flashcards_on_category_delete()
returns trigger as $$
declare
  fallback_category_id uuid;
begin
  select id into fallback_category_id
  from public.categories
  where user_id = old.user_id
    and name = 'inne'
  limit 1;

  if fallback_category_id is null then
    insert into public.categories (user_id, name)
    values (old.user_id, 'inne')
    returning id into fallback_category_id;
  end if;

  update public.flashcards
  set category_id = fallback_category_id
  where category_id = old.id;

  return old;
end;
$$ language plpgsql;

create trigger categories_reassign_flashcards_before_delete
before delete on public.categories
for each row
execute function public.reassign_flashcards_on_category_delete();


