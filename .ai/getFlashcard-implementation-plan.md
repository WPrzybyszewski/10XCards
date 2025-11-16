## API Endpoint Implementation Plan: GET /api/v1/flashcards/:id

### 1. Przegląd punktu końcowego

Endpoint `GET /api/v1/flashcards/:id` zwraca pojedynczą fiszkę należącą do zalogowanego użytkownika, identyfikowaną przez UUID `id`.  
Jeśli fiszka nie istnieje lub nie należy do użytkownika (RLS), endpoint zwraca `404 Not Found`. Brak autentykacji skutkuje `401 Unauthorized`.

### 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/flashcards/:id`
- **Autentykacja**: wymagany ważny token Supabase (rola `authenticated`), obsługiwany przez Astro middleware (`context.locals.supabase`).

- **Parametry**:
  - **Wymagane (path params)**:
    - `id: string (UUID)` – identyfikator fiszki.
  - **Opcjonalne**:
    - brak.

- **Path DTO**:
  - Typ: `FlashcardIdParamDTO` (z `src/types.ts`):
    - `id: FlashcardId` (UUID).

- **Walidacja wejścia**:
  - Wyciągnięcie `id` z ścieżki (`context.params.id` w Astro).
  - Walidacja formatu UUID (np. Zod: `z.string().uuid()` albo prosty regex):
    - jeśli niepoprawny → `400 Bad Request` (opcjonalne, ale zalecane).
  - Brak body (to `GET`).

### 3. Wykorzystywane typy

- **Encja (z `src/types.ts` / `database.types.ts`)**:
  - `FlashcardEntity` → `public.flashcards`
    - Kolumny: `id`, `user_id`, `category_id`, `front`, `back`, `source`, `created_at`, `updated_at`.

- **DTO**:
  - `FlashcardDTO` – reprezentacja fiszki dla klienta:
    - `id`, `category_id`, `front`, `back`, `source`, `created_at`, `updated_at`
    - (bez pola `user_id`).
  - `GetFlashcardResponseDTO` – alias na `FlashcardDTO` dla endpointu `GET /flashcards/:id`.
  - `FlashcardIdParamDTO` – DTO parametrów ścieżki:
    - `id: FlashcardId`.

DTO są bezpośrednio powiązane z `FlashcardEntity` poprzez `Omit<FlashcardEntity, 'user_id'>`, co zapewnia spójność ze schematem DB.

### 4. Szczegóły odpowiedzi

- **Sukces**:
  - `200 OK` – fiszka odnaleziona i należy do zalogowanego użytkownika (RLS).
  - Body (`GetFlashcardResponseDTO` / `FlashcardDTO`):

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

- **Błędy**:
  - `400 Bad Request` – (opcjonalnie) jeśli `id` nie jest poprawnym UUID.
  - `401 Unauthorized` – brak ważnej sesji Supabase.
  - `404 Not Found` – fiszka nie istnieje lub nie należy do użytkownika.
  - `500 Internal Server Error` – nieprzewidziane błędy po stronie serwera (DB, logika).

### 5. Przepływ danych

1. **Klient → Backend**:
   - Frontend wykonuje `GET /api/v1/flashcards/:id` (np. `/api/v1/flashcards/123e4567-e89b-12d3-a456-426614174000`).
   - Żądanie zawiera token Supabase w nagłówku lub cookies.
   - Astro middleware (`src/middleware/index.ts`) tworzy `context.locals.supabase`.

2. **Handler API (Astro)**:
   - Docelowy plik: `src/pages/api/v1/flashcards/[id].ts` lub `.../flashcards/[id].ts` (konwencja dynamicznych routów).
   - Kroki:
     1. Odczyt `const supabase = context.locals.supabase;`.
     2. Weryfikacja użytkownika:
        - `const { data: { user }, error } = await supabase.auth.getUser();`
        - brak użytkownika → `401 Unauthorized`.
     3. Odczyt parametru ścieżki:
        - `const id = context.params.id;`
     4. Walidacja `id` (UUID):
        - jeśli walidacja nie przejdzie → `400 Bad Request`.
     5. Wywołanie serwisu:
        - `const flashcard = await flashcardService.getFlashcardById({ supabase, userId: user.id, flashcardId: id });`
     6. Jeśli `flashcard === null` → `404 Not Found`.
     7. Jeśli istnieje → mapowanie do `GetFlashcardResponseDTO` i `200 OK`.

3. **Serwis biznesowy (`flashcardService`)**:
   - Można użyć istniejącego serwisu od fiszek lub utworzyć nowy plik:
     - `src/lib/services/flashcardService.ts`.
   - Funkcja:

     ```ts
     async function getFlashcardById({
       supabase,
       userId,
       flashcardId,
     }): Promise<FlashcardEntity | null> { ... }
     ```

   - Odpowiedzialność:
     - Wykonanie zapytania do `public.flashcards`:
       - filtr po `id = flashcardId`,
       - opcjonalnie dodatkowy filtr `user_id = userId` (dla przejrzystości; RLS i tak to wymusi).
     - Przykład:

       - `supabase.from('flashcards').select('*').eq('id', flashcardId).maybeEq('user_id', userId).single();`
     - Jeśli `data` brak / error typu `PGRST116` (no rows) → zwrócić `null`.
     - Inne błędy DB → rzucić wyjątek do handlera.

4. **Warstwa DB (Supabase)**:
   - Tabela: `public.flashcards`.
   - RLS:
     - wymusza `user_id = auth.uid()`, więc użytkownik nie odczyta fiszki, która nie jest jego.
   - Zapytanie wybiera pojedynczy rekord po `id` (i potencjalnie `user_id`).

5. **Backend → Klient**:
   - Jeśli `FlashcardEntity` istnieje:
     - mapowanie do `FlashcardDTO` / `GetFlashcardResponseDTO`.
     - `200 OK`.
   - Jeśli nie:
     - `404 Not Found` + prosty komunikat.

### 5. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - Wymagana sesja Supabase (`authenticated`).
  - Brak lub nieważna sesja → `401 Unauthorized`.

- **Autoryzacja / RLS**:
  - Tabela `flashcards` z włączonym RLS:
    - polityki: użytkownik może `select` tylko swoje rekordy (`user_id = auth.uid()`).
  - Backend nie przyjmuje `user_id` z requestu – korzysta wyłącznie z sesji Supabase.

- **Walidacja parametrów**:
  - Path param `id` weryfikowany jako UUID.
  - Zapobiega niepotrzebnym zapytaniom do DB przy ewidentnie niepoprawnych wartościach.

- **Brak ekspozycji danych wrażliwych**:
  - DTO ukrywa `user_id`.
  - Odpowiedzi błędów nie ujawniają szczegółów implementacyjnych (np. pełnych zapytań SQL).

### 6. Obsługa błędów

- **Niepoprawny `id` (UUID)**:
  - `400 Bad Request`.
  - Body: `{ "error": "Invalid flashcard id" }`.

- **Brak autentykacji**:
  - `401 Unauthorized`.
  - Body: `{ "error": "Unauthorized" }`.

- **Fiszka nie istnieje / brak dostępu (RLS)**:
  - Gdy zapytanie do DB nie znajduje rekordu:
    - `404 Not Found`.
    - Body: `{ "error": "Flashcard not found" }`.

- **Błędy bazy danych**:
  - Np. timeout, problemy z połączeniem:
    - logowanie błędu po stronie serwera (stdout / monitoring),
    - `500 Internal Server Error`,
    - Body: `{ "error": "Internal server error" }`.

- **Nieoczekiwane wyjątki**:
  - Globalny `try/catch` w handlerze:
    - loguje stack trace,
    - zwraca `500 Internal Server Error`.

> Uwaga: ten endpoint nie wymaga logowania do `generation_error_logs`, ponieważ nie dotyczy generacji AI; wystarczy standardowe logowanie aplikacyjne.

### 7. Wydajność

- **Charakter zapytania**:
  - Zwraca zawsze maksymalnie jeden rekord – obciążenie DB jest minimalne.
  - Zapytanie po `id` korzysta z indeksu PK (`flashcards.id`), więc jest bardzo szybkie.

- **Scenariusze**:
  - Nawet przy dużej liczbie fiszek na użytkownika, select po PK pozostaje O(1).
  - Nie ma paginacji ani dodatkowych joinów → endpoint jest bardzo lekki.

- **Skalowalność**:
  - Logika stateless po stronie serwera → łatwa skalowalność pozioma.

### 8. Kroki implementacji

1. **Typy / DTO**:
   - Zweryfikuj, że w `src/types.ts` istnieją:
     - `FlashcardDTO`
     - `GetFlashcardResponseDTO` (alias `FlashcardDTO`)
     - `FlashcardIdParamDTO`
   - Jeśli brakuje `FlashcardIdParamDTO`, dodaj go (jeśli będzie używany w handlerach / serwisach).

2. **Walidacja parametrów**:
   - Dodaj schemat Zod dla path params (np. `src/lib/validation/flashcards.ts`):

     ```ts
     const flashcardIdParamSchema = z.object({
       id: z.string().uuid(),
     });
     ```

   - Użyj go w handlerze do walidacji `context.params`.

3. **Serwis `flashcardService`**:
   - Utwórz (lub zaktualizuj) `src/lib/services/flashcardService.ts`.
   - Dodaj funkcję:

     ```ts
     async function getFlashcardById({
       supabase,
       userId,
       flashcardId,
     }): Promise<FlashcardEntity | null> { ... }
     ```

   - Zaimplementuj zapytanie do `flashcards` z filtrem po `id` (i opcjonalnie `user_id`).

4. **Handler API**:
   - Utwórz plik `src/pages/api/v1/flashcards/[id].ts`.
   - W handlerze:
     - odczytaj `supabase` z `context.locals`,
     - zweryfikuj użytkownika (auth),
     - pobierz `id` z `context.params`,
     - zwaliduj `id` przez Zod,
     - wywołaj `flashcardService.getFlashcardById`,
     - obsłuż:
       - `null` → `404`,
       - encję → `200` z `GetFlashcardResponseDTO`,
       - błędy → `500`.

5. **Konfiguracja środowiska**:
   - Endpoint korzysta z istniejącego Supabase (`SUPABASE_URL`, `SUPABASE_KEY`) – brak dodatkowych zmiennych.

6. **Monitorowanie / logowanie**:
   - Zadbaj, aby błędy DB i wyjątki były logowane (stdout / monitoring).
   - Można dodać prostą metrykę liczby wywołań endpointu oraz liczby `404`.


