## 1. Tables (columns, data types, constraints)

### 1.1. Table `public.categories`

- `id uuid primary key default gen_random_uuid()`  
- `user_id uuid not null`  
  - references `auth.users.id` on delete cascade  
- `name text not null`  
  - check `length(trim(name)) > 0`  
- `created_at timestamptz not null default now()`  
- `updated_at timestamptz not null default now()`  

Constraints:
- `unique (user_id, name)` – category names are unique per user.

### 1.2. Table `public.flashcards`

- `id uuid primary key default gen_random_uuid()`  
- `user_id uuid not null`  
  - references `auth.users.id` on delete cascade  
- `category_id uuid not null`  
  - references `public.categories.id` on delete restrict  
- `front varchar(200) not null`  
  - check `length(trim(front)) > 0`  
- `back varchar(500) not null`  
  - check `length(trim(back)) > 0`  
- `source text not null`  
  - check `source in ('manual', 'ai')`  
- `created_at timestamptz not null default now()`  
- `updated_at timestamptz not null default now()`  

Constraints:
- foreign keys as above.

### 1.3. Table `public.generations`

- `id uuid primary key default gen_random_uuid()`  
- `user_id uuid not null`  
  - references `auth.users.id` on delete cascade  
- `input text not null`  
  - raw text used for AI generation  
- `created_at timestamptz not null default now()`  

Constraints:
- foreign key as above.  
- only successful generations are stored in this table (errors go to `generation_error_logs`).

### 1.4. Table `public.generation_proposals`

- `id uuid primary key default gen_random_uuid()`  
- `generation_id uuid not null`  
  - references `public.generations.id` on delete cascade  
- `index smallint not null`  
  - check `index between 0 and 2`  
- `front varchar(200) not null`  
  - check `length(trim(front)) > 0`  
- `back varchar(500) not null`  
  - check `length(trim(back)) > 0`  
- `flashcard_id uuid null`  
  - references `public.flashcards.id` on delete set null  
- `accepted_at timestamptz null`  
- `created_at timestamptz not null default now()`  

Constraints:
- `unique (generation_id, index)` – exactly one row per index 0–2 for a given generation (enforced in combination with application logic).  

### 1.5. Table `public.generation_error_logs`

- `id uuid primary key default gen_random_uuid()`  
- `user_id uuid not null`  
  - references `auth.users.id` on delete cascade  
- `generation_id uuid null`  
  - references `public.generations.id` on delete set null  
  - may be null if error occurred before a `generations` row was created  
- `error_code text null`  
  - e.g. provider‑specific or application‑level error code  
- `error_message text not null`  
  - human‑readable error description (truncated to a reasonable length at application level)  
- `created_at timestamptz not null default now()`  

Constraints:
- foreign keys as above.

## 2. Relationships between tables

### 2.1. Users and categories

- One user (`auth.users`) has many categories (`public.categories`).  
- Relationship: `categories.user_id -> auth.users.id` (1:N).

### 2.2. Users and flashcards

- One user has many flashcards.  
- Relationship: `flashcards.user_id -> auth.users.id` (1:N).

### 2.3. Categories and flashcards

- One category has many flashcards.  
- Relationship: `flashcards.category_id -> categories.id` (1:N).  
- Deleting a category does not cascade to flashcards; instead, a trigger will reassign impacted flashcards to a fallback category (e.g. named "inne") for that user.

### 2.4. Users and generations

- One user has many generations.  
- Relationship: `generations.user_id -> auth.users.id` (1:N).

### 2.5. Generations and generation_proposals

- One generation has many proposals (exactly 3 in business logic).  
- Relationship: `generation_proposals.generation_id -> generations.id` (1:N).  
- Each proposal is distinguished by its `index` (0, 1, 2).

### 2.6. Generation_proposals and flashcards

- A proposal may result in a flashcard when accepted.  
- Relationship: `generation_proposals.flashcard_id -> flashcards.id` (0:1), nullable.  
- This gives a trace from an accepted card back to the proposal that created it (if needed).

### 2.7. Users and generation_error_logs

- One user has many error log entries.  
- Relationship: `generation_error_logs.user_id -> auth.users.id` (1:N).

### 2.8. Generations and generation_error_logs

- A generation may have multiple related error logs (e.g. transient failures, retries), or none.  
- Relationship: `generation_error_logs.generation_id -> generations.id` (0:N).

## 3. Indexes

In addition to primary key indexes automatically created by PostgreSQL:

### 3.1. `public.categories`

- `create unique index categories_user_id_name_key on public.categories (user_id, name);`  
  - supports fast lookups by user and name and enforces uniqueness.
- Optional:  
  - `create index categories_user_id_created_at_idx on public.categories (user_id, created_at desc);`

### 3.2. `public.flashcards`

- `create index flashcards_user_id_created_at_idx on public.flashcards (user_id, created_at desc);`  
  - for listing a user's cards in recency order.  
- `create index flashcards_user_id_category_id_idx on public.flashcards (user_id, category_id);`  
  - for listing cards by category for a user (future filtering).

### 3.3. `public.generations`

- `create index generations_user_id_created_at_idx on public.generations (user_id, created_at desc);`  
  - for viewing a user's recent generations or debugging.

### 3.4. `public.generation_proposals`

- `create unique index generation_proposals_generation_id_index_key on public.generation_proposals (generation_id, index);`  
  - ensures at most one proposal per index for a given generation.  
- `create index generation_proposals_generation_id_idx on public.generation_proposals (generation_id);`  
  - for loading all proposals for a given generation.

### 3.5. `public.generation_error_logs`

- `create index generation_error_logs_user_id_created_at_idx on public.generation_error_logs (user_id, created_at desc);`  
  - for inspecting recent errors per user.  
- `create index generation_error_logs_generation_id_idx on public.generation_error_logs (generation_id);`  
  - for debugging errors related to a specific generation.

## 4. PostgreSQL rules (RLS policies, triggers)

### 4.1. Row Level Security (RLS)

RLS should be enabled on all tables that store user‑scoped data:

```sql
alter table public.categories enable row level security;
alter table public.flashcards enable row level security;
alter table public.generations enable row level security;
alter table public.generation_proposals enable row level security;
alter table public.generation_error_logs enable row level security;
```

Example policies for role `authenticated` (Supabase convention), using `auth.uid()`:

#### 4.1.1. `public.categories`

```sql
create policy categories_select_own
on public.categories
for select
to authenticated
using (user_id = auth.uid());

create policy categories_insert_own
on public.categories
for insert
to authenticated
with check (user_id = auth.uid());

create policy categories_update_own
on public.categories
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy categories_delete_own
on public.categories
for delete
to authenticated
using (user_id = auth.uid());
```

#### 4.1.2. `public.flashcards`

```sql
create policy flashcards_select_own
on public.flashcards
for select
to authenticated
using (user_id = auth.uid());

create policy flashcards_insert_own
on public.flashcards
for insert
to authenticated
with check (user_id = auth.uid());

create policy flashcards_update_own
on public.flashcards
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy flashcards_delete_own
on public.flashcards
for delete
to authenticated
using (user_id = auth.uid());
```

#### 4.1.3. `public.generations`

```sql
create policy generations_select_own
on public.generations
for select
to authenticated
using (user_id = auth.uid());

create policy generations_insert_own
on public.generations
for insert
to authenticated
with check (user_id = auth.uid());
```

MVP nie wymaga aktualizacji ani usuwania rekordów `generations` przez użytkownika, więc można pominąć polityki `update`/`delete` lub pozostawić je tylko dla ról serwisowych.

#### 4.1.4. `public.generation_proposals`

Ponieważ `generation_proposals` są powiązane z `generations`, polityki mogą być oparte na `exists`:

```sql
create policy generation_proposals_select_own
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

create policy generation_proposals_update_own
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
```

Wstawianie wierszy `generation_proposals` zwykle odbywa się z backendu (np. funkcja serwisowa po udanej generacji AI), więc można ograniczyć `insert` do roli serwisowej lub funkcji `rpc`.

#### 4.1.5. `public.generation_error_logs`

```sql
create policy generation_error_logs_select_own
on public.generation_error_logs
for select
to authenticated
using (user_id = auth.uid());
```

Wstawianie logów błędów (`insert`) powinno być ograniczone do roli serwisowej / backendu (np. Supabase `service_role`), więc politykę można zdefiniować tylko dla odpowiedniej roli albo wykonywać wstawienia poza RLS (np. przez edge functions).

### 4.2. Triggers

#### 4.2.1. Update `updated_at`

Dla tabel `categories` i `flashcards` (opcjonalnie także innych) można dodać prosty trigger aktualizujący `updated_at`:

```sql
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger flashcards_set_updated_at
before update on public.flashcards
for each row
execute function public.set_updated_at();
```

#### 4.2.2. Reassign flashcards on category delete

Przy usunięciu kategorii wszystkie powiązane fiszki powinny zostać przeniesione do kategorii zastępczej (np. o nazwie "inne") danego użytkownika.

Przykładowy trigger (upraszcza logikę – zakłada istnienie dokładnie jednej kategorii o nazwie "inne" dla danego `user_id`):

```sql
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
    -- optionally: create the fallback category automatically
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
```

## 5. Additional notes

- All domain tables (`categories`, `flashcards`, `generations`, `generation_proposals`, `generation_error_logs`) use `uuid` primary keys and refer back to `auth.users.id` for ownership.  
- The schema is normalized (no duplicated user data, separated generations and proposals) and prepared for future extensions such as spaced repetition data, analytics, or richer logging.  
- Business rule “exactly 3 proposals per generation” is primarily enforced in application logic; the database helps by constraining `index` to `0..2` and making `(generation_id, index)` unique.  
- Deletions are hard deletes in MVP; future iterations can add `deleted_at` columns if soft delete becomes necessary.  
- The RLS policies and triggers shown here are examples; in Supabase migrations they should be adapted to the exact role names and deployment conventions used in the project.


