## REST API Plan

## 1. Resources

1. `Category`
   - DB table: `public.categories`
   - Represents a user-defined category that groups flashcards.
   - Key fields: `id`, `user_id`, `name`, `created_at`, `updated_at`.
2. `Flashcard`
   - DB table: `public.flashcards`
   - Represents a single flashcard belonging to a user and a category.
   - Key fields: `id`, `user_id`, `category_id`, `front`, `back`, `source`, `created_at`, `updated_at`.
3. `Generation`
   - DB table: `public.generations`
   - Represents a single AI generation request (successful only).
   - Key fields: `id`, `user_id`, `input`, `created_at`.
4. `GenerationProposal` (internal/business)
   - DB table: `public.generation_proposals`
   - Represents one of up to three proposals produced by a generation.
   - Key fields: `id`, `generation_id`, `index`, `front`, `back`, `flashcard_id`, `accepted_at`, `created_at`.
5. `GenerationErrorLog` (internal/observability)
   - DB table: `public.generation_error_logs`
   - Represents an error during AI generation, for debugging and monitoring.
   - Key fields: `id`, `user_id`, `generation_id`, `error_code`, `error_message`, `created_at`.

Public API resources (exposed to the frontend client in MVP):

- `categories`
- `flashcards`
- `generator` (AI generation + acceptance of proposals)
- `learning` (random flashcard fetch)

Internal-only resources in MVP (used by the backend only):

- `generations`
- `generation_proposals`
- `generation_error_logs`

All user-scoped resources are owned by a user via `user_id -> auth.users.id`, enforced by Supabase Row Level Security (RLS).

---

## 2. Endpoints

Base URL prefix for all endpoints:

- `/api/v1/...`

Authentication:

- All endpoints (except those relying solely on Supabase JS on the client) require a valid Supabase access token.
- The frontend will typically send `Authorization: Bearer <access_token>`; the Astro backend uses the Supabase server client / RLS to derive `auth.uid()` and `user_id`.

Below, `user_id` is never accepted from the client; it is derived from the authenticated session.

### 2.1. Categories

#### 2.1.1. List categories

- Method: `GET`
- Path: `/api/v1/categories`
- Description: List all categories of the authenticated user.
- Query parameters:
  - `limit` (optional, integer, default 100, max 500) – soft pagination.
  - `offset` (optional, integer, default 0).
- Request body: none.
- Response 200 JSON:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "string",
      "created_at": "2025-11-15T10:00:00.000Z",
      "updated_at": "2025-11-15T10:00:00.000Z"
    }
  ],
  "limit": 100,
  "offset": 0,
  "total": null
}
```

Notes:

- `total` can be `null` in MVP to avoid count queries; can be added later.

Success codes:

- `200 OK` – list returned.

Error codes:

- `401 Unauthorized` – missing/invalid Supabase token.
- `500 Internal Server Error` – unexpected failure.

---

#### 2.1.2. Create category

- Method: `POST`
- Path: `/api/v1/categories`
- Description: Create a new category for the authenticated user.
- Request JSON:

```json
{
  "name": "Biology"
}
```

Validation:

- `name` required, non-empty after trimming.
- Length reasonable for UI (e.g. 1–100 chars) – enforced in validation; DB enforces `length(trim(name)) > 0`.
- Name must be unique per user (`unique(user_id, name)`); duplicates return a conflict.

Response 201 JSON:

```json
{
  "id": "uuid",
  "name": "Biology",
  "created_at": "2025-11-15T10:00:00.000Z",
  "updated_at": "2025-11-15T10:00:00.000Z"
}
```

Success codes:

- `201 Created` – category created.

Error codes:

- `400 Bad Request` – missing/invalid `name`.
- `401 Unauthorized` – not authenticated.
- `409 Conflict` – category with the same name already exists for this user.
- `500 Internal Server Error`.

---

#### 2.1.3. Update category

- Method: `PATCH`
- Path: `/api/v1/categories/:id`
- Description: Rename a category owned by the user.
- Path params:
  - `id` – UUID of the category.
- Request JSON:

```json
{
  "name": "New name"
}
```

Validation:

- Same as creation: non-empty, unique per user.

Response 200 JSON:

```json
{
  "id": "uuid",
  "name": "New name",
  "created_at": "2025-11-15T10:00:00.000Z",
  "updated_at": "2025-11-15T11:00:00.000Z"
}
```

Success codes:

- `200 OK` – updated successfully.

Error codes:

- `400 Bad Request` – invalid `name`.
- `401 Unauthorized`.
- `404 Not Found` – category not found or not owned by user.
- `409 Conflict` – new name already used by another category.
- `500 Internal Server Error`.

---

#### 2.1.4. Delete category

- Method: `DELETE`
- Path: `/api/v1/categories/:id`
- Description: Delete a category and reassign its flashcards to fallback `"inne"` category via DB trigger.
- Path params:
  - `id` – UUID of the category.
- Request body: none.
- Response 204:
  - Empty body.

Behavior:

- Before delete, DB trigger `reassign_flashcards_on_category_delete` ensures all flashcards with this `category_id` are moved to a fallback category `"inne"` per user, creating it if needed.

Success codes:

- `204 No Content` – category deleted and cards reassigned.

Error codes:

- `401 Unauthorized`.
- `404 Not Found` – category not found or not owned by user.
- `500 Internal Server Error`.

---

### 2.2. Flashcards

#### 2.2.1. List flashcards

- Method: `GET`
- Path: `/api/v1/flashcards`
- Description: List flashcards for the authenticated user, optionally filtered by category and paginated.
- Query parameters:
  - `category_id` (optional, UUID) – filter by category.
  - `limit` (optional, integer, default 50, max 200).
  - `offset` (optional, integer, default 0).
  - `order` (optional, string, default `created_desc`, accepted: `created_desc`, `created_asc`).

Response 200 JSON:

```json
{
  "items": [
    {
      "id": "uuid",
      "category_id": "uuid",
      "front": "What is photosynthesis?",
      "back": "Process by which plants convert light energy into chemical energy.",
      "source": "ai",
      "created_at": "2025-11-15T10:00:00.000Z",
      "updated_at": "2025-11-15T10:00:00.000Z"
    }
  ],
  "limit": 50,
  "offset": 0,
  "total": null
}
```

Success codes:

- `200 OK`.

Error codes:

- `401 Unauthorized`.
- `400 Bad Request` – invalid query params.
- `500 Internal Server Error`.

---

#### 2.2.2. Create flashcard (manual)

- Method: `POST`
- Path: `/api/v1/flashcards`
- Description: Create a new flashcard manually.
- Request JSON:

```json
{
  "category_id": "uuid",
  "front": "Question text",
  "back": "Answer text"
}
```

Validation:

- `category_id` required and must belong to the user.
- `front` required, trimmed length 1–200 characters.
- `back` required, trimmed length 1–500 characters.
- `source` set to `"manual"` by backend.

Response 201 JSON:

```json
{
  "id": "uuid",
  "category_id": "uuid",
  "front": "Question text",
  "back": "Answer text",
  "source": "manual",
  "created_at": "2025-11-15T10:00:00.000Z",
  "updated_at": "2025-11-15T10:00:00.000Z"
}
```

Success codes:

- `201 Created`.

Error codes:

- `400 Bad Request` – invalid/missing `category_id`, `front`, or `back` (including length).
- `401 Unauthorized`.
- `404 Not Found` – `category_id` does not exist or not owned by the user.
- `500 Internal Server Error`.

---

#### 2.2.3. Get single flashcard

- Method: `GET`
- Path: `/api/v1/flashcards/:id`
- Description: Get a single flashcard owned by the user.
- Path params:
  - `id` – UUID of the flashcard.

Response 200 JSON:

```json
{
  "id": "uuid",
  "category_id": "uuid",
  "front": "Question text",
  "back": "Answer text",
  "source": "manual",
  "created_at": "2025-11-15T10:00:00.000Z",
  "updated_at": "2025-11-15T10:00:00.000Z"
}
```

Success codes:

- `200 OK`.

Error codes:

- `401 Unauthorized`.
- `404 Not Found` – flashcard not found or not owned.
- `500 Internal Server Error`.

---

#### 2.2.4. Update flashcard

- Method: `PATCH`
- Path: `/api/v1/flashcards/:id`
- Description: Update flashcard content and/or category.
- Path params:
  - `id` – UUID of the flashcard.
- Request JSON (partial update):

```json
{
  "category_id": "uuid",
  "front": "Updated question",
  "back": "Updated answer"
}
```

Validation:

- If provided, `category_id` must belong to the user.
- If provided, `front`/`back` must respect length and non-empty rules.
- `source` is not editable from the API (remains `"manual"` or `"ai"`).

Response 200 JSON:

```json
{
  "id": "uuid",
  "category_id": "uuid",
  "front": "Updated question",
  "back": "Updated answer",
  "source": "manual",
  "created_at": "2025-11-15T10:00:00.000Z",
  "updated_at": "2025-11-15T11:00:00.000Z"
}
```

Success codes:

- `200 OK`.

Error codes:

- `400 Bad Request` – invalid payload.
- `401 Unauthorized`.
- `404 Not Found` – flashcard not found or not owned.
- `500 Internal Server Error`.

---

#### 2.2.5. Delete flashcard

- Method: `DELETE`
- Path: `/api/v1/flashcards/:id`
- Description: Permanently delete a flashcard.
- Path params:
  - `id` – UUID of the flashcard.
- Request body: none.

Response:

- `204 No Content`.

Error codes:

- `401 Unauthorized`.
- `404 Not Found`.
- `500 Internal Server Error`.

---

### 2.3. AI generator (proposals + accept)

#### 2.3.1. Generate flashcard proposals

- Method: `POST`
- Path: `/api/v1/flashcards/generate`
- Description: Generate three flashcard proposals from user-provided text using AI. Creates a `generations` row and three `generation_proposals` rows on success.
- Request JSON:

```json
{
  "input": "long text (1000–10000 characters) copied from notes or article"
}
```

Validation:

- `input` required.
- `input` length (after trim) must be between 1000 and 10000 characters (inclusive); shorter or longer input results in `400 Bad Request`.

Response 200 JSON (success):

```json
{
  "generation_id": "uuid",
  "proposals": [
    {
      "id": "uuid",
      "index": 0,
      "front": "Question 1 (<=200 chars)",
      "back": "Answer 1 (<=500 chars)"
    },
    {
      "id": "uuid",
      "index": 1,
      "front": "Question 2",
      "back": "Answer 2"
    },
    {
      "id": "uuid",
      "index": 2,
      "front": "Question 3",
      "back": "Answer 3"
    }
  ]
}
```

Behavior:

- Backend calls Openrouter.ai with the input and an internal prompt template.
- On success:
  - Validates each proposal’s `front` and `back` length constraints.
  - Creates `generations` row and three `generation_proposals` rows.
- On failure:
  - Logs error to `generation_error_logs` with `user_id`, optional `generation_id`, `error_code`, `error_message`.
  - Returns a friendly error response.

Success codes:

- `200 OK` – three proposals returned.

Error codes:

- `400 Bad Request` – invalid or missing `input`.
- `401 Unauthorized`.
- `502 Bad Gateway` – AI provider error (e.g. Openrouter timeout).
- `500 Internal Server Error` – unexpected failure.

---

#### 2.3.2. Accept (and save) a proposal

- Method: `POST`
- Path: `/api/v1/flashcards/accept`
- Description: Accept a selected AI proposal (with optional inline edits) and create a flashcard. Marks the proposal as accepted.
- Request JSON:

```json
{
  "generation_id": "uuid",
  "proposal_id": "uuid",
  "category_id": "uuid",
  "front": "Edited question text",
  "back": "Edited answer text"
}
```

Validation:

- `generation_id` and `proposal_id` required.
- `generation_id` must belong to the authenticated user.
- `proposal_id` must be a proposal for the given `generation_id`.
- `category_id` must exist and belong to the user.
- `front` and `back` required, 1–200 and 1–500 chars respectively after trim.

Behavior:

- Verifies that `generation` and `proposal` belong to the user.
- Creates a new `flashcards` row with:
  - `source = "ai"`,
  - provided `category_id`, `front`, `back`.
- Updates `generation_proposals`:
  - sets `accepted_at` to `now()`,
  - sets `flashcard_id` to the new card’s `id`.

Response 201 JSON:

```json
{
  "flashcard": {
    "id": "uuid",
    "category_id": "uuid",
    "front": "Edited question text",
    "back": "Edited answer text",
    "source": "ai",
    "created_at": "2025-11-15T10:00:00.000Z",
    "updated_at": "2025-11-15T10:00:00.000Z"
  }
}
```

Success codes:

- `201 Created`.

Error codes:

- `400 Bad Request` – invalid payload or length constraints violated.
- `401 Unauthorized`.
- `404 Not Found` – generation or proposal not found / not owned by user.
- `409 Conflict` – proposal already accepted (optional check).
- `500 Internal Server Error`.

---

### 2.4. Learning (random flashcard)

#### 2.4.1. Get a random flashcard

- Method: `GET`
- Path: `/api/v1/flashcards/random`
- Description: Returns a random flashcard for the authenticated user, optionally filtered by category. Client is responsible for avoiding repeats within a session.
- Query parameters:
  - `category_id` (optional, UUID) – limit random selection to a specific category.

Response 200 JSON:

```json
{
  "id": "uuid",
  "category_id": "uuid",
  "front": "Random question",
  "back": "Answer",
  "source": "ai",
  "created_at": "2025-11-15T10:00:00.000Z",
  "updated_at": "2025-11-15T10:00:00.000Z"
}
```

Behavior:

- The backend selects a single random row from the user’s flashcards (optionally filtered by category).
- MVP does not track per-session history; the frontend should manage not showing the same card twice in a session.

Success codes:

- `200 OK` – random flashcard returned.
- `404 Not Found` – user has no flashcards (or none in that category).

Error codes:

- `401 Unauthorized`.
- `500 Internal Server Error`.

---

### 2.5. Optional internal/admin endpoints (not required for MVP UI)

For debugging (can be implemented later, behind admin auth or service role):

1. `GET /api/v1/debug/generations` – list recent generations for current user.
2. `GET /api/v1/debug/generation-error-logs` – list recent error logs for current user or for admin, all logs.

These endpoints would expose data directly from `generations` and `generation_error_logs`, filtered by `user_id` or guarded by additional roles.

---

## 3. Authentication and Authorization

### 3.1. Authentication

- The project uses Supabase authentication.
- Frontend authenticates via `@supabase/supabase-js` on the client side.
- Tokens are sent to the backend as:
  - `Authorization: Bearer <supabase access token>`, or
  - Supabase-authenticated cookies depending on integration.

The Astro middleware (`src/middleware/index.ts`) attaches a typed Supabase client (`context.locals.supabase`) created with service credentials or per-request session, and RLS is enforced based on the token.

### 3.2. Authorization

- All data tables (`categories`, `flashcards`, `generations`, `generation_proposals`, `generation_error_logs`) have RLS enabled.
- RLS policies ensure:
  - role `authenticated` can `select/insert/update/delete` only rows with `user_id = auth.uid()`;
  - role `anon` has no access (`using (false)`).
- API endpoints never accept `user_id` from the client; they derive ownership from `auth.uid()` via Supabase.
- Some write operations (e.g. insertion into `generation_proposals` and `generation_error_logs`) can be restricted to server-side / service-role contexts.

### 3.3. Rate limiting and security measures

MVP guidelines (implementation details depend on hosting stack):

- Apply basic per-IP / per-user rate limits on:
  - `POST /api/v1/flashcards/generate`
  - `POST /api/v1/flashcards/accept`
  - `POST /api/v1/flashcards`
- Use HTTPS in all environments.
- Sanitize and validate all payloads to avoid injection and ensure constraints are met before hitting the database.
- Avoid exposing `service_role` key to the client; use only anon keys in frontend.

---

## 4. Validation and Business Logic

### 4.1. Categories

Validation:

- `name` required, trimmed, non-empty, length ≤100 (UI-level), DB-level `check(length(trim(name)) > 0)`.
- `name` unique per user (DB `unique(user_id, name)`).

Business logic:

- When deleting a category:
  - DB trigger reassigns all flashcards to user’s `"inne"` category, creating it automatically if missing.
- Category ownership is enforced by RLS and `user_id`.

### 4.2. Flashcards

Validation:

- `front` required, trimmed, `1–200` characters; DB-level `varchar(200)` and `check(length(trim(front)) > 0)`.
- `back` required, trimmed, `1–500` characters; DB-level `varchar(500)` and `check(length(trim(back)) > 0)`.
- `category_id` must exist and belong to the authenticated user.
- `source` is controlled by the backend (`"manual"` or `"ai"`), not by client.

Business logic:

- Manual creation sets `source = "manual"`.
- AI acceptance sets `source = "ai"`.
- Hard deletes (`DELETE`) remove flashcards permanently.

### 4.3. Generations and proposals

Validation:

- `input` non-empty; length (after trim) must be between 1000 and 10000 characters (inclusive) to keep prompts meaningful but bounded kosztowo.
- When generating:
  - AI output is parsed and validated so that for each proposal:
    - `front` and `back` obey length constraints.
    - Exactly three proposals are produced (business rule).
- When accepting a proposal:
  - `generation_id` and `proposal_id` must match and belong to the user.
  - `proposal_id` must not already be accepted (optional additional check).

Business logic:

- `POST /flashcards/generate`:
  - Calls Openrouter.ai with a prompt template derived from PRD guidelines for flashcard quality.
  - On success, writes `generations` + 3 `generation_proposals`.
  - On failure, writes a `generation_error_logs` row and returns a friendly error.
- `POST /flashcards/accept`:
  - Creates a flashcard with `source = "ai"`.
  - Marks the proposal as accepted (`accepted_at`, `flashcard_id`).

### 4.4. Learning (random)

Validation:

- Optional `category_id` must belong to the user if provided.

Business logic:

- Random card is selected from user’s flashcards (optional category filter).
- No SRS or schedule in MVP:
  - no `reviews` table,
  - no difficulty ratings,
  - no due dates.
- Client is responsible for avoiding repeats in a single session.

### 4.5. Error logging

Validation:

- `error_message` required, may be truncated before insert.
- `user_id` required; `generation_id` optional.

Business logic:

- `generation_error_logs` is write-only for server/service-role.
- Authenticated users can read their own logs (optional debug views).
- Used to diagnose AI provider failures and generation issues.

---

This plan is designed to map cleanly onto the existing PostgreSQL schema and Supabase setup, while keeping the external API surface minimal and focused on the core MVP flows: category management, manual flashcards, AI-assisted generation, and simple learning.\*\*\*
