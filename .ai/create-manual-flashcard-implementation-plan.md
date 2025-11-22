## API Endpoint Implementation Plan: POST /api/v1/flashcards (manual create)

### 1. Przegląd punktu końcowego

Endpoint służy do **ręcznego tworzenia fiszek** przez zalogowanego użytkownika.  
Tworzy rekord w tabeli `public.flashcards` powiązany z użytkownikiem (`user_id` z sesji) i z wybraną kategorią (`category_id`), ustawiając `source = "manual"`.  
Operacja jest dostępna wyłącznie dla uwierzytelnionych użytkowników i respektuje RLS Supabase.

---

### 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/flashcards`
- **Nagłówki**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <supabase-access-token>` (przekazywany tak, jak w pozostałych endpointach; sesja rozwiązywana w middleware)

- **Parametry**:
  - **Wymagane (body JSON)**:
    - `category_id: string (UUID)` – identyfikator kategorii, która musi należeć do bieżącego użytkownika.
    - `front: string` – treść pytania; po `trim()` długość `1–200` znaków.
    - `back: string` – treść odpowiedzi; po `trim()` długość `1–500` znaków.
  - **Niedozwolone w body**:
    - `id`, `user_id`, `source`, `created_at`, `updated_at` – kontrolowane przez backend/DB, nie przyjmujemy ich od klienta.

- **Request body (przykład)**:

```json
{
  "category_id": "b3f6a4c8-3f2b-4b1a-9a7d-1c3d2b4f5e6a",
  "front": "What is photosynthesis?",
  "back": "Process by which plants convert light energy into chemical energy."
}
```

---

### 3. Wykorzystywane typy

Oparte na `src/types.ts`:

- **Encje / DTO**:
  - `FlashcardDTO = Omit<FlashcardEntity, 'user_id'>;`
    - Pola: `id`, `category_id`, `front`, `back`, `source`, `created_at`, `updated_at`.
  - `CreateFlashcardResponseDTO = FlashcardDTO;`

- **Command modele**:
  - `CreateFlashcardCommand`:
    - `category_id: FlashcardEntity['category_id'];`
    - `front: FlashcardEntity['front'];`
    - `back: FlashcardEntity['back'];`

- **Supabase client**:
  - `SupabaseClient` z `src/db/supabase.client.ts` (typ eksportowany jako alias, zgodnie z regułami projektu).

- **Nowe / rozszerzone typy walidacji (do dodania w `src/lib/validation/flashcards.ts`)**:
  - `createFlashcardBodySchema` – Zod schema mapująca body żądania na `CreateFlashcardCommand` (po trimie), z walidacją długości i formatu UUID.
  - `CreateFlashcardBodyInput = z.infer<typeof createFlashcardBodySchema>;` (opcjonalny alias).

- **Serwis domenowy (do rozszerzenia `src/lib/services/flashcardService.ts`)**:
  - `createFlashcard(params: { supabase: SupabaseClient; userId: string; command: CreateFlashcardCommand; }): Promise<CreateFlashcardResponseDTO>`

---

### 4. Szczegóły odpowiedzi

#### 4.1. Sukces

- **Status**: `201 Created`
- **Body (JSON)** – nowo utworzona fiszka:

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

W implementacji:
- Odpowiedź będzie zwracana jako `CreateFlashcardResponseDTO`,
- Dane pobieramy z `insert ... select ... single()` w Supabase, aby mieć faktyczne wartości `id`, `created_at`, `updated_at`.

#### 4.2. Błędy

- `400 Bad Request`
  - nieprawidłowe body (brak pól, zła długość `front/back`, nieprawidłowy UUID `category_id`),
  - mapowane z błędów walidacji Zod (`createFlashcardBodySchema`).
- `401 Unauthorized`
  - brak sesji w `context.locals.session` lub brak `session.user.id`.
- `404 Not Found`
  - `category_id` nie istnieje lub nie należy do użytkownika (brak w tabeli `categories` w kontekście RLS).
- `500 Internal Server Error`
  - dowolny nieoczekiwany błąd serwisu / Supabase (np. problemy z połączeniem, naruszenie constraintów niepokryte wcześniej).

Struktura błędów powinna być spójna z istniejącym helperem `createErrorResponse` w `src/lib/http.ts`.

---

### 5. Przepływ danych

#### 5.1. Wejście → Middleware → Endpoint

1. Klient wysyła `POST /api/v1/flashcards` z JSON body i nagłówkiem `Authorization`.
2. **Middleware (`src/middleware/index.ts`)**:
   - Tworzy `supabase` server client (`createSupabaseServerClient`),
   - Ładuje sesję (`supabase.auth.getSession()`),
   - Ustawia:
     - `context.locals.supabase`,
     - `context.locals.session`.
3. Żądanie trafia do `src/pages/api/v1/flashcards/index.ts`, do nowego handlera `POST`.

#### 5.2. Logika w handlerze POST

1. Wyciągnij z `APIContext`:
   - `locals.supabase`,
   - `locals.session`.
2. **Autoryzacja**:
   - Jeśli `!locals.session?.user?.id` → `401 Unauthorized` przez `createErrorResponse`.
3. **Odczyt i walidacja body**:
   - `const body = await context.request.json();`
   - Walidacja przez `createFlashcardBodySchema.safeParse(body)`.
   - W razie błędu:
     - wybierz pierwszą issue (lub pełną listę) i zwróć `400 Bad Request` z polem `field` / `issues`.
4. **Sprawdzenie kategorii**:
   - Wywołaj:
     ```ts
     const { data, error } = await supabase
       .from("categories")
       .select("id")
       .eq("id", command.category_id)
       .maybeSingle();
     ```
   - Dzięki RLS rekord będzie widoczny tylko, jeśli należy do użytkownika.
   - Jeśli:
     - `data == null` (brak rekordu) → zwróć `404 Not Found` ("Category not found."),
     - inny błąd DB → `500 Internal Server Error`.
5. **Utworzenie fiszki**:
   - `const flashcard = await createFlashcard({ supabase, userId: session.user.id, command });`
   - Serwis:
     - wykonuje `insert` do `public.flashcards` z polami:
       - `user_id: userId`,
       - `category_id: command.category_id`,
       - `front: trimmedFront`,
       - `back: trimmedBack`,
       - `source: 'manual'`.
     - używa `select(...)` + `.single()` aby zwrócić pełny `FlashcardDTO`.
6. **Odpowiedź**:
   - Po sukcesie zwróć `createJsonResponse(201, flashcard)` zgodne z `CreateFlashcardResponseDTO`.

#### 5.3. RLS i własność danych

- `user_id` nie jest przyjmowany z requestu – zawsze pochodzi z `session.user.id`.
- RLS w tabelach `categories` i `flashcards` zapewnia, że:
  - przy SELECT na `categories` użytkownik zobaczy tylko swoje kategorie,
  - przy INSERT do `flashcards` polityka `with check (user_id = auth.uid())` wymusi zgodność `user_id`.

---

### 6. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - Endpoint wymaga aktywnej sesji Supabase; brak/wygasły token → `401 Unauthorized`.
- **Autoryzacja**:
  - Użytkownik może tworzyć fiszki tylko w swoich kategoriach:
    - weryfikacja przez SELECT na `categories` + RLS,
    - brak `user_id` w body (pole kontrolowane przez backend).
- **Integralność danych**:
  - `front` i `back` są trymowane przed zapisaniem i ograniczone długością.
  - `source` jest zawsze ustawiane przez backend na `"manual"` i **nigdy** nie pochodzi z body.
  - Nie przyjmujemy `user_id`, `created_at`, `updated_at` z zewnątrz.
- **Brak logów wrażliwych danych**:
  - W logach (np. `console.error`) nie logujemy pełnych treści `front/back` przy błędach, jedynie kody/struktury błędu (np. Zod issues, kody Supabase).
- **Ochrona przed nadużyciami** (do rozważenia):
  - Możliwość dodania rate limiting na `POST /api/v1/flashcards` (np. Cloudflare / DigitalOcean App firewall).

---

### 7. Obsługa błędów

- **400 Bad Request**:
  - walidacja Zod nie powiodła się (`createFlashcardBodySchema.safeParse`):
    - brak `category_id`, `front`, `back`,
    - nieprawidłowy UUID,
    - długość `front/back` poza zakresem po `trim()`.
  - Struktura odpowiedzi:
    - `code`: `"Bad Request"`,
    - `message`: opis pierwszego błędu,
    - `details`: `{ field, issues }`.

- **401 Unauthorized**:
  - brak `locals.session?.user?.id`.
  - Odpowiedź: `"You must be signed in to create flashcards."`.

- **404 Not Found**:
  - kategoria nie istnieje lub nie jest widoczna dla użytkownika (SELECT `categories` zwraca `data == null`).
  - Odpowiedź: `"Category not found."`.

- **500 Internal Server Error**:
  - Niespodziewane błędy Supabase (inne niż „no rows”), np. problemy z połączeniem, naruszenia constraintów niepokryte przez walidację.
  - W handlerze:
    - `console.error("Unexpected error in POST /api/v1/flashcards", error);`
    - `createErrorResponse(500, "Internal Server Error", "Something went wrong. Please try again later.");`

Brak potrzeby logowania do `generation_error_logs` – to endpoint CRUD, nie AI generator.

---

### 8. Wydajność

- Operacja składa się z:
  - jednego SELECT do `categories` (sprawdzenie własności),
  - jednego INSERT + SELECT do `flashcards`.
- Istniejące indeksy:
  - `flashcards_user_id_created_at_idx`,
  - `flashcards_user_id_category_id_idx`,
  - zapewniają dobrą wydajność późniejszego listowania/filtracji.
- Brak pętli, brak dużych payloadów – endpoint jest **O(1)** względem danych.
- Możliwe optymalizacje (na później):
  - zawężenie wybieranych kolumn przy SELECT do `categories` (`select('id')`),
  - ewentualne połączenie walidacji kategorii i inserta w RPC, jeśli kiedyś okaże się to wąskim gardłem.

---

### 9. Kroki implementacji

1. **Walidacja (Zod)** – `src/lib/validation/flashcards.ts`
   - [ ] Dodać `createFlashcardBodySchema`:
     - `category_id: z.string().uuid()`,
     - `front: z.string().transform((v) => v.trim()).refine((v) => v.length >= 1 && v.length <= 200, "front must be between 1 and 200 characters after trimming.")`,
     - `back: z.string().transform((v) => v.trim()).refine((v) => v.length >= 1 && v.length <= 500, "back must be between 1 and 500 characters after trimming.")`.
   - [ ] (Opcjonalnie) wyeksportować `CreateFlashcardBodyInput`.

2. **Serwis domenowy** – `src/lib/services/flashcardService.ts`
   - [ ] Dodać:
     ```ts
     export interface CreateFlashcardParams {
       supabase: SupabaseClient;
       userId: string;
       command: CreateFlashcardCommand;
     }

     export async function createFlashcard(
       params: CreateFlashcardParams,
     ): Promise<CreateFlashcardResponseDTO> {
       const { supabase, userId, command } = params;
       const { category_id, front, back } = command;

       const { data, error } = await supabase
         .from("flashcards")
         .insert({
           user_id: userId,
           category_id,
           front,
           back,
           source: "manual",
         })
         .select("id, category_id, front, back, source, created_at, updated_at")
         .single();

       if (error) {
         throw new Error(`Failed to create flashcard: ${error.message}`);
       }

       return data as CreateFlashcardResponseDTO;
     }
     ```

3. **Handler API** – `src/pages/api/v1/flashcards/index.ts`
   - [ ] Rozszerzyć istniejący plik (obecnie ma `GET`) o:
     ```ts
     export async function POST(context: APIContext): Promise<Response> {
       const { locals } = context;
       const supabase = locals.supabase;
       const session = locals.session;

       if (!session?.user?.id) {
         return createErrorResponse(
           401,
           "Unauthorized",
           "You must be signed in to create flashcards.",
         );
       }

       if (!supabase) {
         return createErrorResponse(
           500,
           "Internal Server Error",
           "Supabase client not available.",
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

       const parseResult = createFlashcardBodySchema.safeParse(body);
       if (!parseResult.success) {
         const firstIssue = parseResult.error.issues[0];
         return createErrorResponse(
           400,
           "Bad Request",
           firstIssue.message,
           {
             field: firstIssue.path.join("."),
             issues: parseResult.error.issues,
           },
         );
       }

       const command = parseResult.data;

       // Opcjonalne jawne sprawdzenie istnienia kategorii (SELECT z RLS)
       const { data: category, error: categoryError } = await supabase
         .from("categories")
         .select("id")
         .eq("id", command.category_id)
         .maybeSingle();

       if (categoryError) {
         // eslint-disable-next-line no-console
         console.error(
           "Unexpected error when validating category in POST /api/v1/flashcards",
           categoryError,
         );
         return createErrorResponse(
           500,
           "Internal Server Error",
           "Something went wrong. Please try again later.",
         );
       }

       if (!category) {
         return createErrorResponse(404, "Not Found", "Category not found.");
       }

       try {
         const flashcard = await createFlashcard({
           supabase,
           userId: session.user.id,
           command,
         });

         return createJsonResponse(201, flashcard);
       } catch (error) {
         // eslint-disable-next-line no-console
         console.error("Unexpected error in POST /api/v1/flashcards", error);
         return createErrorResponse(
           500,
           "Internal Server Error",
           "Something went wrong. Please try again later.",
         );
       }
     }
     ```
   - [ ] Upewnić się, że importy (`createJsonResponse`, `createErrorResponse`, schemy i serwis) są poprawne i zgodne z aliasami `@/...`.

4. **Testy jednostkowe (Vitest)**  
   - [ ] Testy `createFlashcardBodySchema`:
     - poprawny payload,
     - za krótki / za długi `front/back`,
     - niepoprawny UUID `category_id`,
     - brak wymaganych pól.
   - [ ] Testy serwisu `createFlashcard` z mockowanym SupabaseClient:
     - sukces inserta,
     - błąd DB → oczekiwany `Error`.

5. **Testy endpointu (integracyjne / E2E)**  
   - [ ] `POST` z poprawnym body i ważną sesją → `201`, body odpowiada schematowi `CreateFlashcardResponseDTO`.
   - [ ] `POST` z niepoprawnym body → `400`.
   - [ ] `POST` z nieistniejącym `category_id` → `404`.
   - [ ] `POST` bez autoryzacji → `401`.

6. **Przegląd i refaktoryzacja**
   - [ ] Sprawdzić spójność kodów statusu i formatów odpowiedzi z resztą API.
   - [ ] Upewnić się, że endpoint przechodzi `npm run lint` i `npm run test:unit`.


