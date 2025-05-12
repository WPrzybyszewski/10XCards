-- migrate: 2024-06-16 19:12:30 UTC
--
-- name: create_flashcard_schema
-- description: initial schema for flashcard application including categories, flashcards, generations, generation_error_logs, custom enum types, trigger functions, indexes and row level security policies.
--
-- IMPORTANT: this migration creates new enum types, tables, indexes, triggers and RLS policies.
-- It is designed for a fresh database. Adjust with caution if applying to an existing database.
--
-- +----------------------------------------------------------------------------------------------------------------+
-- | SECTION 1: EXTENSIONS                                                                                        |
-- +----------------------------------------------------------------------------------------------------------------+

-- pgcrypto is required for gen_random_uuid()
create extension if not exists pgcrypto;

-- +----------------------------------------------------------------------------------------------------------------+
-- | SECTION 2: ENUM TYPES                                                                                         |
-- +----------------------------------------------------------------------------------------------------------------+

-- enum for flashcard source (manual vs ai)
create type public.flashcard_source as enum ('manual', 'ai');

-- enum representing the status of an ai generation task
create type public.generation_status as enum ('pending', 'processing', 'completed', 'failed');

-- +----------------------------------------------------------------------------------------------------------------+
-- | SECTION 3: HELPER FUNCTIONS                                                                                   |
-- +----------------------------------------------------------------------------------------------------------------+

-- purpose: automatically update the updated_at column on row modifications
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.handle_updated_at() is 'function to automatically update the updated_at timestamp on row modification.';

-- +----------------------------------------------------------------------------------------------------------------+
-- | SECTION 4: TABLES                                                                                              |
-- +----------------------------------------------------------------------------------------------------------------+

-- table: categories
create table public.categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name varchar(100) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.categories is 'stores user-defined categories for flashcards.';
comment on column public.categories.id is 'primary key for the category.';
comment on column public.categories.user_id is 'foreign key referencing the user who owns the category.';
comment on column public.categories.name is 'name of the category (max 100 characters).';
comment on column public.categories.created_at is 'timestamp of when the category was created.';
comment on column public.categories.updated_at is 'timestamp of when the category was last updated.';

-- table: generations
create table public.generations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    source_text text not null,
    model_used varchar(100) not null,
    status public.generation_status not null default 'pending',
    generated_flashcards jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.generations is 'stores information about ai flashcard generation tasks.';
comment on column public.generations.id is 'primary key for the generation task.';
comment on column public.generations.user_id is 'foreign key referencing the user who initiated the generation.';
comment on column public.generations.source_text is 'the original text provided by the user for generation.';
comment on column public.generations.model_used is 'identifier of the ai model used for generation.';
comment on column public.generations.status is 'current status of the generation task.';
comment on column public.generations.generated_flashcards is 'raw json output from the ai containing suggested flashcards, before user review/acceptance.';
comment on column public.generations.created_at is 'timestamp of when the generation task was created.';
comment on column public.generations.updated_at is 'timestamp of when the generation task was last updated.';

-- table: flashcards
create table public.flashcards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category_id uuid references public.categories(id) on delete set null,
    generation_id uuid references public.generations(id) on delete set null,
    question varchar(200) not null,
    answer varchar(500) not null,
    source public.flashcard_source not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.flashcards is 'stores the flashcards created by users.';
comment on column public.flashcards.id is 'primary key for the flashcard.';
comment on column public.flashcards.user_id is 'foreign key referencing the user who owns the flashcard.';
comment on column public.flashcards.category_id is 'optional foreign key referencing the category this flashcard belongs to. set to null if the category is deleted.';
comment on column public.flashcards.generation_id is 'optional foreign key referencing the ai generation task that created this flashcard. null for manually created flashcards. set to null if the generation is deleted.';
comment on column public.flashcards.question is 'the question part of the flashcard (max 200 characters).';
comment on column public.flashcards.answer is 'the answer part of the flashcard (max 500 characters).';
comment on column public.flashcards.source is 'indicates whether the flashcard was created manually or by ai.';
comment on column public.flashcards.created_at is 'timestamp of when the flashcard was created.';
comment on column public.flashcards.updated_at is 'timestamp of when the flashcard was last updated.';

-- table: generation_error_logs
create table public.generation_error_logs (
    id uuid primary key default gen_random_uuid(),
    generation_id uuid not null references public.generations(id) on delete cascade,
    error_message text not null,
    error_details jsonb,
    logged_at timestamptz not null default now()
);

comment on table public.generation_error_logs is 'logs errors encountered during ai flashcard generation.';
comment on column public.generation_error_logs.id is 'primary key for the error log entry.';
comment on column public.generation_error_logs.generation_id is 'foreign key referencing the generation task that failed.';
comment on column public.generation_error_logs.error_message is 'description of the error.';
comment on column public.generation_error_logs.error_details is 'optional json containing more detailed error information (e.g., api response, stack trace).';
comment on column public.generation_error_logs.logged_at is 'timestamp of when the error was logged.';

-- +----------------------------------------------------------------------------------------------------------------+
-- | SECTION 5: INDEXES                                                                                             |
-- +----------------------------------------------------------------------------------------------------------------+

-- categories
create index idx_categories_user_id on public.categories(user_id);

-- flashcards
create index idx_flashcards_user_id on public.flashcards(user_id);
create index idx_flashcards_category_id on public.flashcards(category_id);
create index idx_flashcards_generation_id on public.flashcards(generation_id);
create index idx_flashcards_question on public.flashcards(question);
create index idx_flashcards_answer on public.flashcards(answer);

-- generations
create index idx_generations_user_id on public.generations(user_id);
create index idx_generations_status on public.generations(status);

-- generation_error_logs
create index idx_generation_error_logs_generation_id on public.generation_error_logs(generation_id);

-- +----------------------------------------------------------------------------------------------------------------+
-- | SECTION 6: TRIGGERS                                                                                            |
-- +----------------------------------------------------------------------------------------------------------------+

-- categories updated_at trigger
create trigger trg_categories_updated_at
before update on public.categories
for each row
execute function public.handle_updated_at();

-- flashcards updated_at trigger
create trigger trg_flashcards_updated_at
before update on public.flashcards
for each row
execute function public.handle_updated_at();

-- generations updated_at trigger
create trigger trg_generations_updated_at
before update on public.generations
for each row
execute function public.handle_updated_at();

-- +----------------------------------------------------------------------------------------------------------------+
-- | SECTION 7: ROW LEVEL SECURITY                                                                                  |
-- +----------------------------------------------------------------------------------------------------------------+

-- enable rls
alter table public.categories enable row level security;
alter table public.flashcards enable row level security;
alter table public.generations enable row level security;
alter table public.generation_error_logs enable row level security;

-- ---------------------------------------------------------------------------------------------------------------
-- categories policies
-- ---------------------------------------------------------------------------------------------------------------

create policy authenticated_select_own_categories
  on public.categories
  for select
  using (auth.uid() = user_id);

create policy authenticated_insert_own_categories
  on public.categories
  for insert
  with check (auth.uid() = user_id);

create policy authenticated_update_own_categories
  on public.categories
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy authenticated_delete_own_categories
  on public.categories
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------------------------------------------
-- flashcards policies
-- ---------------------------------------------------------------------------------------------------------------

create policy authenticated_select_own_flashcards
  on public.flashcards
  for select
  using (auth.uid() = user_id);

create policy authenticated_insert_own_flashcards
  on public.flashcards
  for insert
  with check (auth.uid() = user_id);

create policy authenticated_update_own_flashcards
  on public.flashcards
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy authenticated_delete_own_flashcards
  on public.flashcards
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------------------------------------------
-- generations policies
-- ---------------------------------------------------------------------------------------------------------------

create policy authenticated_select_own_generations
  on public.generations
  for select
  using (auth.uid() = user_id);

create policy authenticated_insert_own_generations
  on public.generations
  for insert
  with check (auth.uid() = user_id);

create policy authenticated_update_own_generations
  on public.generations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy authenticated_delete_own_generations
  on public.generations
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------------------------------------------
-- generation_error_logs policies
-- ---------------------------------------------------------------------------------------------------------------

create policy authenticated_select_own_generation_error_logs
  on public.generation_error_logs
  for select
  using (
    exists (
      select 1
      from public.generations g
      where g.id = generation_id
        and g.user_id = auth.uid()
    )
  );

-- insert/update/delete not permitted for authenticated role; service_role bypasses rls 