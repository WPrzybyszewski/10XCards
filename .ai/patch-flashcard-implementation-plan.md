## API Endpoint Implementation Plan: PATCH /api/v1/flashcards/:id

### 1. Przegląd punktu końcowego

Endpoint służy do **częściowej aktualizacji istniejącej fiszki** należącej do zalogowanego użytkownika.  
Pozwala zmienić treść pytania (`front`), odpowiedzi (`back`) oraz przypisaną kategorię (`category_id`).  
Nie pozwala modyfikować pól kontrolowanych przez system (`source`, `user_id`, `created_at`, `updated_at`), które pozostają spójne z dotychczasową logiką (np. `source = "manual"` lub `"ai"`).

---

### 2. Szczegóły żądania

- **Metoda HTTP**: `PATCH`
- **Struktura URL**: `/api/v1/flashcards/:id`
  - `:id` – UUID aktualizowanej fiszki.

- **Nagłówki**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <supabase-access-token>`

- **Parametry**:
  - **Path params (wymagane)**:
    - `id: string (UUID)` – identyfikator fiszki.
  - **Body (wszystkie pola opcjonalne, ale co najmniej jedno powinno być obecne)**:
    - `category_id?: string (UUID)` – nowa kategoria; jeśli podana, musi należeć do użytkownika.
    - `front?: string` – nowa treść pytania; po `trim()` długość `1–200` znaków.
    - `back?: string` – nowa treść odpowiedzi; po `trim()` długość `1–500` znaków.

- **Niedozwolone w body**:
  - `id`, `user_id`, `source`, `created_at`, `updated_at`.

- **Przykładowe body**:

```json
{
  "category_id": "uuid",
  "front": "Updated question",
  "back": "Updated answer"
}
```

---

### 3. Wykorzystywane typy

Na podstawie `src/types.ts`:

- **DTO / encje**:
  - `FlashcardDTO = Omit<FlashcardEntity, 'user_id'>;`
  - `UpdateFlashcardResponseDTO = FlashcardDTO;`

- **Command model**:
  - `UpdateFlashcardCommand`:
    - `category_id?: FlashcardEntity['category_id'];`
    - `front?: FlashcardEntity['front'];`
    - `back?: FlashcardEntity['back'];`

- **Supabase**:
  - `SupabaseClient` z `src/db/supabase.client.ts`.

- **Nowe typy walidacji (`src/lib/validation/flashcards.ts`)**:
  - `updateFlashcardParamsSchema = z.object({ id: z.string().uuid() });`
  - `updateFlashcardBodySchema`:
    - obiekt z opcjonalnymi polami:
      - `category_id?: z.string().uuid()`,
      - `front?: z.string().transform(trim).refine(1–200)`,
      - `back?: z.string().transform(trim).refine(1–500)`,
    - dodatkowa reguła: co najmniej jedno z pól musi być obecne.

- **Serwis domenowy (`src/lib/services/flashcardService.ts`)**:
  - `updateFlashcard(params: { supabase: SupabaseClient; userId: string; id: string; command: UpdateFlashcardCommand; }): Promise<UpdateFlashcardResponseDTO | null>`
    - `null` → fiszka nie istnieje / nie należy do użytkownika,
    - DTO → zaktualizowana fiszka.

---

### 4. Szczegóły odpowiedzi

- **Sukces**:
  - Status: `200 OK`
  - Body (JSON) – `UpdateFlashcardResponseDTO`:

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

- **Błędy**:
  - `400 Bad Request` – nieprawidłowe `id`, błędne body (brak pól, złe długości, zły UUID).
  - `401 Unauthorized` – brak sesji użytkownika.
  - `404 Not Found` – fiszka nie istnieje lub nie należy do użytkownika, albo wskazana kategoria nie istnieje / nie należy do użytkownika.
  - `500 Internal Server Error` – nieoczekiwany błąd po stronie serwera / Supabase.

---

### 5. Przepływ danych

#### 5.1. Middleware → Endpoint

1. Klient wysyła `PATCH /api/v1/flashcards/:id` z JSON body + nagłówek `Authorization`.
2. **Middleware**:
   - tworzy Supabase server client,
   - ładuje sesję (`supabase.auth.getSession()`),
   - ustawia `locals.supabase` i `locals.session`.
3. Żądanie trafia do `src/pages/api/v1/flashcards/[id].ts`, do handlera `PATCH`.

#### 5.2. Logika handlera PATCH

1. Wyciągnij z `APIContext`:
   - `locals.supabase`, `locals.session`, `params.id`.
2. **Guard: autoryzacja**:
   - jeśli `!session?.user?.id` → `401 Unauthorized`.
3. **Guard: dostępność Supabase**:
   - jeśli `!supabase` → `500`.
4. **Walidacja paramów ścieżki**:
   - Przepuść `{ id: params.id ?? "" }` przez `updateFlashcardParamsSchema.safeParse`.
   - Przy błędzie → `400 Bad Request` z `field: "id"`.
5. **Odczyt i walidacja body**:
   - `await context.request.json()` w `try/catch`:
     - jeśli JSON niepoprawny → `400` („Request body must be valid JSON”).
   - Walidacja przez `updateFlashcardBodySchema.safeParse(body)`:
     - zapewnia:
       - opcjonalność pól,
       - trim i limity długości,
       - `at least one key` (np. przez `.refine` na obiekcie).
   - W razie błędu walidacji → `400 Bad Request` z listą issues.
6. **Opcjonalna walidacja kategorii**:
   - Jeśli `command.category_id` jest podane:
     - SELECT:
       ```ts
       const { data: category, error } = await supabase
         .from("categories")
         .select("id")
         .eq("id", command.category_id)
         .maybeSingle();
       ```
     - `error` ≠ „no rows” → `500`.
     - `category == null` → `404 Category not found`.
7. **Wywołanie serwisu domenowego**:
   - `const updated = await updateFlashcard({ supabase, userId: session.user.id, id, command });`
   - Serwis:
     - buduje `updatePayload` tylko z podanych pól,
     - wykonuje:
       ```ts
       const { data, error } = await supabase
         .from("flashcards")
         .update(updatePayload)
         .eq("id", id)
         .select("id, category_id, front, back, source, created_at, updated_at")
         .maybeSingle();
       ```
     - RLS zapewnia, że aktualizowany jest wyłącznie wiersz należący do użytkownika.
     - `error` → rzuca `Error("Failed to update flashcard: ...")`,
     - `data == null` → `null`,
     - `data != null` → zwraca `UpdateFlashcardResponseDTO`.
8. **Zwrócenie odpowiedzi**:
   - `updated == null` → `404 Not Found` („Flashcard not found.”).
   - `updated != null` → `200 OK` z JSON DTO (`createJsonResponse(200, updated)`).

#### 5.3. RLS

- Tabela `flashcards` ma włączony RLS:
  - zasady `flashcards_update_own` wymuszają `user_id = auth.uid()` dla update.
- Dzięki temu:
  - nie trzeba ręcznie porównywać `user_id` – próba aktualizacji cudzej fiszki skończy się brakiem danych (`data == null`) → `404`.

---

### 6. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - wymagana aktywna sesja Supabase (`session.user.id`).
- **Autoryzacja**:
  - RLS ogranicza operacje do fiszek użytkownika.
  - przy aktualizacji kategorii SELECT do `categories` + RLS pilnuje, że `category_id` należy do użytkownika.
- **Integralność danych**:
  - `source` nie jest edytowalne – nie czytamy go z body i nie ustawiamy ręcznie (zostaje istniejąca wartość).
  - `front` i `back` zawsze są trymowane i sprawdzane długością po stronie API; DB ma dodatkowe constraints (`varchar(200/500)`, `check(length(trim(...)) > 0)`).
- **Bezpieczeństwo danych**:
  - w logach nie zapisujemy pełnej treści fiszek (`front/back`), tylko ID i informacje diagnostyczne.

---

### 7. Obsługa błędów

- **400 Bad Request**:
  - nieprawidłowy `id` (nie-UUID),
  - niepoprawne body (brak jakichkolwiek pól, błędne długości, złe UUID w `category_id`).
  - Zwracane z opisem pierwszego błędu i listą `issues`.

- **401 Unauthorized**:
  - brak `session.user.id` (użytkownik niezalogowany).

- **404 Not Found**:
  - fiszka nie istnieje lub nie jest własnością użytkownika (`updateFlashcard` zwraca `null`),
  - albo `category_id` przekierowuje na nieistniejącą / cudzą kategorię (SELECT do `categories` nie zwraca danych).

- **500 Internal Server Error**:
  - błędy Supabase (inne niż „no rows”),
  - niespodziewane wyjątki (np. w serwisie).
  - Logujemy:
    - `console.error("Unexpected error in PATCH /api/v1/flashcards/:id", error);`

Nie ma potrzeby integrowania z tabelą `generation_error_logs` – to dotyczy generatora AI, nie ręcznego CRUD.

---

### 8. Wydajność

- Operacja wykorzystuje maksymalnie:
  - jedno SELECT do `categories` (tylko jeśli zmieniany jest `category_id`),
  - jedno `UPDATE + SELECT` do `flashcards`.
- Indeksy:
  - PK na `flashcards.id`,
  - indeksy per `user_id` + `created_at`, `category_id` – wspierają inne operacje (listowanie).
- Brak pętli / dużych payloadów – złożoność czasowa O(1).

---

### 9. Kroki implementacji

1. **Walidacja – `src/lib/validation/flashcards.ts`**
   - [ ] Dodać:
     ```ts
     export const updateFlashcardParamsSchema = z.object({
       id: z.string().uuid(),
     });
     ```
   - [ ] Dodać:
     ```ts
     export const updateFlashcardBodySchema = z
       .object({
         category_id: z.string().uuid().optional(),
         front: z
           .string()
           .transform((v) => v.trim())
           .refine(
             (v) => v.length >= 1 && v.length <= 200,
             "front must be between 1 and 200 characters after trimming.",
           )
           .optional(),
         back: z
           .string()
           .transform((v) => v.trim())
           .refine(
             (v) => v.length >= 1 && v.length <= 500,
             "back must be between 1 and 500 characters after trimming.",
           )
           .optional(),
       })
       .refine(
         (value) =>
           value.category_id !== undefined ||
           value.front !== undefined ||
           value.back !== undefined,
         {
           message: "At least one of category_id, front or back must be provided.",
         },
       );
     ```

2. **Serwis – `src/lib/services/flashcardService.ts`**
   - [ ] Dodać:
     ```ts
     export interface UpdateFlashcardParams {
       supabase: SupabaseClient;
       userId: string;
       id: string;
       command: UpdateFlashcardCommand;
     }

     export async function updateFlashcard(
       params: UpdateFlashcardParams,
     ): Promise<UpdateFlashcardResponseDTO | null> {
       const { supabase, id, command } = params;

       const updatePayload: Record<string, unknown> = {};

       if (command.category_id !== undefined) {
         updatePayload.category_id = command.category_id;
       }
       if (command.front !== undefined) {
         updatePayload.front = command.front;
       }
       if (command.back !== undefined) {
         updatePayload.back = command.back;
       }

       if (Object.keys(updatePayload).length === 0) {
         return null;
       }

       const { data, error } = await supabase
         .from("flashcards")
         .update(updatePayload)
         .eq("id", id)
         .select("id, category_id, front, back, source, created_at, updated_at")
         .maybeSingle();

       if (error) {
         throw new Error(`Failed to update flashcard: ${error.message}`);
       }

       if (!data) {
         return null;
       }

       return data as UpdateFlashcardResponseDTO;
     }
     ```

3. **Endpoint – `src/pages/api/v1/flashcards/[id].ts`**
   - [ ] Utworzyć (lub rozszerzyć, jeśli istnieje dla DELETE/GET) handler:
     ```ts
     export async function PATCH(context: APIContext): Promise<Response> {
       const { locals, params } = context;
       const supabase = locals.supabase;
       const session = locals.session;

       if (!session?.user?.id) {
         return createErrorResponse(
           401,
           "Unauthorized",
           "You must be signed in to update flashcards.",
         );
       }

       if (!supabase) {
         return createErrorResponse(
           500,
           "Internal Server Error",
           "Supabase client not available.",
         );
       }

       const paramsResult = updateFlashcardParamsSchema.safeParse({
         id: params.id ?? "",
       });

       if (!paramsResult.success) {
         const firstIssue = paramsResult.error.issues[0];
         return createErrorResponse(
           400,
           "Bad Request",
           firstIssue.message,
           {
             field: firstIssue.path.join("."),
             issues: paramsResult.error.issues,
           },
         );
       }

       let body: unknown;
       try {
         body = await context.request.json();
       } catch {
         return createErrorResponse(
           400,
           "Bad Request",
           "Request body must be valid JSON.",
         );
       }

       const bodyResult = updateFlashcardBodySchema.safeParse(body);
       if (!bodyResult.success) {
         const firstIssue = bodyResult.error.issues[0];
         return createErrorResponse(
           400,
           "Bad Request",
           firstIssue.message,
           {
             field: firstIssue.path.join("."),
             issues: bodyResult.error.issues,
           },
         );
       }

       const { id } = paramsResult.data;
       const command = bodyResult.data;

       if (command.category_id) {
         const { data: category, error: categoryError } = await supabase
           .from("categories")
           .select("id")
           .eq("id", command.category_id)
           .maybeSingle();

         if (categoryError) {
           // eslint-disable-next-line no-console
           console.error(
             "Unexpected error when validating category in PATCH /api/v1/flashcards/:id",
             categoryError,
           );
           return createErrorResponse(
             500,
             "Internal Server Error",
             "Something went wrong. Please try again later.",
           );
         }

         if (!category) {
           return createErrorResponse(
             404,
             "Not Found",
             "Category not found.",
           );
         }
       }

       try {
         const updated = await updateFlashcard({
           supabase,
           userId: session.user.id,
           id,
           command,
         });

         if (!updated) {
           return createErrorResponse(
             404,
             "Not Found",
             "Flashcard not found.",
           );
         }

         return createJsonResponse(200, updated);
       } catch (error) {
         // eslint-disable-next-line no-console
         console.error(
           "Unexpected error in PATCH /api/v1/flashcards/:id",
           error,
         );
         return createErrorResponse(
           500,
           "Internal Server Error",
           "Something went wrong. Please try again later.",
         );
       }
     }
     ```

4. **Testy jednostkowe (Vitest)**  
   - Testy `updateFlashcardParamsSchema` i `updateFlashcardBodySchema` (UUID, długości, brak wszystkich pól).
   - Testy serwisu `updateFlashcard` z mockowanym Supabase (udany update, brak fiszki, błąd DB).

5. **Testy integracyjne / E2E**  
   - `PATCH` na istniejącej fiszce → `200` i zaktualizowane dane.
   - `PATCH` z nieistniejącym `id` → `404`.
   - `PATCH` z nieistniejącym `category_id` → `404`.
   - `PATCH` bez sesji → `401`.
   - `PATCH` z pustym body → `400`.

6. **Lint i review**  
   - Upewnić się, że endpoint przechodzi `npm run lint` i `npm run test:unit`.  
   - Zweryfikować spójność formatów odpowiedzi, importów i stylu z innymi endpointami w module `flashcards`.


