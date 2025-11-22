## API Endpoint Implementation Plan: POST /api/v1/flashcards

### 1. Przegląd punktu końcowego

Endpoint służy do **ręcznego tworzenia fiszek** przez zalogowanego użytkownika.  
Tworzy rekord w tabeli `public.flashcards` powiązany z użytkownikiem (`user_id` z sesji) i z wybraną kategorią (`category_id`), ustawiając `source = "manual"`.  
Operacja jest dostępna wyłącznie dla uwierzytelnionych użytkowników i respektuje RLS Supabase.

---

### 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **URL**: `/api/v1/flashcards`
- **Headers**:
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
  - `CreateFlashcardBodyInput = z.infer<typeof createFlashcardBodySchema>;` (opcjonalny alias, jeśli potrzebny).

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
  - dowolny nieoczekiwany błąd serwisu / Supabase (np. problemy z połączeniem, naruszenie constraintów nieprzechwycone wcześniej).

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
   - Jeśli brak `locals.session?.user?.id` → `401 Unauthorized` przez `createErrorResponse`.
3. **Odczyt i walidacja body**:
   - `const body = await context.request.json();`
   - Walidacja przez `createFlashcardBodySchema.safeParse(body)`.
   - W razie błędu:
     - wybierz pierwszą issue (lub pełną listę) i zwróć `400 Bad Request` z polem `field` / `issues`.
4. **Sprawdzenie kategorii**:
   - Wywołaj serwis lub wewnętrzną funkcję:
     - `supabase.from('categories').select('id').eq('id', command.category_id).single();`
   - Dzięki RLS rekord będzie widoczny tylko, jeśli należy do użytkownika.
   - Jeśli:
     - brak danych (`data` puste / błąd typu `PGRST116` lub status 406/404) → zwróć `404 Not Found` ("Category not found").
     - inny błąd DB → `500 Internal Server Error`.

5. **Utworzenie fiszki** (serwis domenowy):
   - `createFlashcard({ supabase, userId: session.user.id, command });`
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
    - dodatkowe sprawdzenie w serwisie, że kategoria istnieje (w przeciwnym razie 404).
- **Integralność danych**:
  - `front` i `back` są trymowane przed zapisaniem i ograniczone długością.
  - `source` jest zawsze ustawiane przez backend na `"manual"` i **nigdy** nie pochodzi z body.
  - Nie przyjmujemy `user_id`, `created_at`, `updated_at` z zewnątrz.
- **Brak logów wrażliwych danych**:
  - W logach (np. `console.error`) nie logujemy pełnych treści `front/back` przy błędach, jedynie kody/struktury błędu (np. Zod issues, kody Supabase).
- **Ochrona przed nadużyciami** (do rozważenia):
  - Możliwość dodania rate limiting na `POST /api/v1/flashcards` (np. Cloudflare / Nginx / DO), szczególnie dla anonimowych ataków.

---

### 7. Obsługa błędów

#### 7.1. Mapowanie błędów na statusy HTTP

- **400 Bad Request**:
  - Walidacja Zod nie powiodła się (`createFlashcardBodySchema.safeParse`):
    - brak `category_id`, `front`, `back`,
    - nieprawidłowy UUID,
    - długość `front/back` poza zakresem po `trim()`.
  - Struktura odpowiedzi (spójna z innymi endpointami):
    - `code`: `"Bad Request"`,
    - `message`: opis pierwszego błędu,
    - `details`: `{ field, issues }`.

- **401 Unauthorized**:
  - Brak `locals.session?.user?.id`.
  - Odpowiedź: `"You must be signed in to create flashcards."`.

- **404 Not Found**:
  - Kategoria nie istnieje lub nie jest widoczna dla użytkownika (SELECT `categories` zwraca brak danych).
  - Odpowiedź: `"Category not found."`.

- **500 Internal Server Error**:
  - Niespodziewane błędy Supabase (inne niż „no rows”), np. problemy z połączeniem, naruszenia constraintów niepokryte przez walidację.
  - W handlerze:
    - `console.error("Unexpected error in POST /api/v1/flashcards", error);`
    - `createErrorResponse(500, "Internal Server Error", "Something went wrong. Please try again later.");`

#### 7.2. Logowanie błędów

- Dla tego endpointu **nie korzystamy** z tabeli `generation_error_logs` (dotyczy ona generatora AI).  
- Wystarczające jest:
  - konsolowe logowanie błędów serwisu / Supabase z krótkim prefiksem,
  - zachowanie spójnego formatu odpowiedzi JSON dla klienta.

---

### 8. Rozważania dotyczące wydajności

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
  - ewentualne zbicie SELECT kategorii + insert w RPC, jeśli kiedyś okaże się to wąskim gardłem (na razie niepotrzebne).

---

### 9. Etapy wdrożenia

1. **Walidacja (Zod)** – `src/lib/validation/flashcards.ts`
   - [ ] Dodać `createFlashcardBodySchema`:
     - `category_id: z.string().uuid()`,
     - `front: z.string().transform(trim).refine(1–200)`,
     - `back: z.string().transform(trim).refine(1–500)`.
   - [ ] Wyeksportować typ `CreateFlashcardBodyInput` (opcjonalnie).

2. **Serwis domenowy** – `src/lib/services/flashcardService.ts`
   - [ ] Dodać interfejs parametrów:
     - `interface CreateFlashcardParams { supabase: SupabaseClient; userId: string; command: CreateFlashcardCommand; }`
   - [ ] Zaimplementować `createFlashcard(params: CreateFlashcardParams): Promise<CreateFlashcardResponseDTO>`:
     - [ ] Opcjonalnie upewnić się, że `front/back` są już przycięte (jeśli Zod robi `transform`, serwis przyjmuje już poprawne wartości).
     - [ ] Wykonać `insert` do `flashcards` z `user_id`, `category_id`, `front`, `back`, `source: 'manual'`.
     - [ ] Dodać `.select("id, category_id, front, back, source, created_at, updated_at").single();`
     - [ ] Obsłużyć błędy Supabase i opakować je w `Error` z czytelnym komunikatem (np. `Failed to create flashcard: ${error.message}`), tak by endpoint mógł je zalogować i zamienić na 500.

3. **Sprawdzenie kategorii** – w serwisie lub handlerze
   - Opcja A (zalecana): w handlerze API:
     - [ ] Po walidacji `body` zrobić:
       - `supabase.from('categories').select('id').eq('id', category_id).single();`
     - [ ] Jeśli brak danych → `404 Not Found`.
   - Opcja B: w serwisie `createFlashcard` (przekazać `category_id`, zrobić wewnątrz SELECT + INSERT) – decyzja po stronie zespołu, ważne by logika była w jednym miejscu.

4. **Handler API** – `src/pages/api/v1/flashcards/index.ts`
   - Plik już istnieje z `GET` (listowaniem). Rozszerzamy go o:
   - [ ] Eksport `export async function POST(context: APIContext): Promise<Response> { ... }`
   - Wewnątrz:
     - [ ] Odczytać `locals.supabase` i `locals.session`.
     - [ ] Zwrócić `401` jeśli brak `session.user.id`.
     - [ ] Odczytać i zwalidować body przez `createFlashcardBodySchema.safeParse`.
     - [ ] Sprawdzić istnienie kategorii (SELECT na `categories`).
     - [ ] Wywołać `createFlashcard`.
     - [ ] Zwrócić `createJsonResponse(201, flashcard)`.
     - [ ] W `catch` zalogować błąd `console.error("Unexpected error in POST /api/v1/flashcards", error);` i zwrócić `500`.

5. **Testy jednostkowe / integracyjne**
   - [ ] Dodać testy walidacji Zod dla `createFlashcardBodySchema` (np. w `src/lib/validation/flashcards.test.ts`):
     - poprawne payloady,
     - za krótkie / za długie `front/back`,
     - niepoprawne UUID.
   - [ ] Dodać testy serwisu `createFlashcard` z mockowanym SupabaseClient (Vitest + `vi.fn()`).
   - [ ] Dodać testy endpointu (np. w Playwright lub Vitest + `fetch` do lokalnego serwera Astro):
     - `201` dla poprawnego requestu,
     - `400` dla błędnego body,
     - `404` kiedy kategoria nie istnieje,
     - `401` dla braku sesji.

6. **E2E (opcjonalnie)**
   - [ ] Dodać scenariusz E2E: zalogowany użytkownik w UI tworzy fiszkę → UI wysyła `POST /api/v1/flashcards` → nowa fiszka pojawia się na liście (`GET /api/v1/flashcards`).

7. **Przegląd i refaktoryzacja**
   - [ ] Upewnić się, że endpoint korzysta ze wspólnych helperów (`createErrorResponse`, `createJsonResponse`).
   - [ ] Sprawdzić logi pod kątem braku wycieków danych wrażliwych.
   - [ ] Zoptymalizować nazwy i miejsca funkcji tak, by pozostały spójne z resztą serwisów (`categoryService`, `flashcardGeneratorService`, itp.).


