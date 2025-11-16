## API Endpoint Implementation Plan: GET /api/v1/flashcards/random

### 1. Przegląd punktu końcowego

Endpoint `GET /api/v1/flashcards/random` zwraca **losową fiszkę** należącą do zalogowanego użytkownika, opcjonalnie ograniczoną do konkretnej kategorii (`category_id`).  
MVP nie śledzi historii przeglądania – odpowiedzialność za unikanie powtórek w danej sesji spoczywa na kliencie (frontend).

### 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/flashcards/random`
- **Autentykacja**: wymagany ważny token Supabase (rola `authenticated`), obsługiwany przez Astro middleware (`context.locals.supabase`).

- **Parametry**:
  - **Wymagane**:
    - brak.
  - **Opcjonalne (query)**:
    - `category_id: string (UUID)` – ogranicza losowanie do fiszek w konkretnej kategorii użytkownika.

- **Query DTO**:
  - Typ: `GetRandomFlashcardQueryDTO` (z `src/types.ts`):
    - `category_id?: FlashcardEntity['category_id'];`

- **Walidacja wejścia**:
  - Parsowanie query string → obiekt `GetRandomFlashcardQueryDTO`.
  - Jeśli `category_id` jest podane:
    - walidacja formatu UUID (np. prosty regex lub Zod: `z.string().uuid()`),
    - brak wymogu odrębnego sprawdzania, czy kategoria należy do użytkownika – RLS na `flashcards` i tak uniemożliwi dostęp do cudzych kart.
  - Brak body (to `GET`).

### 3. Wykorzystywane typy

- **Encje (z `src/types.ts` / `database.types.ts`)**:
  - `FlashcardEntity` → `public.flashcards`
    - Kolumny: `id`, `user_id`, `category_id`, `front`, `back`, `source`, `created_at`, `updated_at`.

- **DTO**:
  - `FlashcardDTO` – publiczna reprezentacja fiszki (bez `user_id`):
    - `id`, `category_id`, `front`, `back`, `source`, `created_at`, `updated_at`.
  - `GetRandomFlashcardQueryDTO` – parametry zapytania:
    - `category_id?: FlashcardEntity['category_id'];`
  - `GetRandomFlashcardResponseDTO` – odpowiedź:
    - alias na `FlashcardDTO`.

DTO jest bezpośrednio powiązane z encją `flashcards` poprzez `Omit<FlashcardEntity, 'user_id'>`, co zapewnia spójność typów z bazą.

### 4. Szczegóły odpowiedzi

- **Sukces**:
  - `200 OK` – znaleziono co najmniej jedną fiszkę (zgodną z filtrem).
  - Body (`GetRandomFlashcardResponseDTO` / `FlashcardDTO`):

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

- **Brak fiszek**:
  - `404 Not Found` – gdy:
    - użytkownik nie ma żadnych fiszek,
    - lub nie ma fiszek w danej kategorii (`category_id`).
  - Body: np. `{ "error": "No flashcards found" }`.

- **Błędy**:
  - `400 Bad Request` – (opcjonalnie) jeśli `category_id` nie jest poprawnym UUID.
  - `401 Unauthorized` – brak ważnej sesji Supabase.
  - `500 Internal Server Error` – nieprzewidziane błędy po stronie serwera (DB, logika).

### 5. Przepływ danych

1. **Klient → Backend**:
   - Frontend wykonuje `GET /api/v1/flashcards/random` z ewentualnym query:
     - `/api/v1/flashcards/random?category_id=<uuid>`.
   - Żądanie przechodzi przez middleware (`src/middleware/index.ts`):
     - `context.locals.supabase` zostaje zainicjalizowany.

2. **Handler API (Astro)**:
   - Docelowy plik: `src/pages/api/v1/flashcards/random.ts`.
   - Kroki:
     1. Odczyt `const supabase = context.locals.supabase;`.
     2. Weryfikacja użytkownika:
        - `const { data: { user }, error } = await supabase.auth.getUser();`
        - brak użytkownika → `401`.
     3. Parsowanie query:
        - z `request.url` wyciągnij `category_id`,
        - zbuduj obiekt `GetRandomFlashcardQueryDTO`.
     4. Walidacja (np. Zod):
        - jeśli `category_id` jest podane → `uuid` lub `400`.
     5. Wywołanie serwisu:
        - `const flashcard = await randomFlashcardService.getRandomFlashcard({ supabase, userId: user.id, categoryId });`
     6. Jeśli serwis zwróci brak fiszki → `404`.
     7. Jeśli jest fiszka → mapuj do `GetRandomFlashcardResponseDTO` i zwróć `200`.

3. **Serwis biznesowy (random flashcard)**:
   - Nowy plik: `src/lib/services/randomFlashcardService.ts`.
   - Funkcja publiczna:

     ```ts
     async function getRandomFlashcard({
       supabase,
       userId,
       categoryId,
     }): Promise<FlashcardEntity | null> { ... }
     ```

   - Odpowiedzialność:
     - Budowa zapytania do `public.flashcards`:
       - filtr `user_id = auth.uid()` zapewnia RLS; dodatkowo w kodzie możemy filtrować po `userId` dla przejrzystości.
       - jeśli `categoryId` jest podane, dodać filtr `category_id = categoryId`.
     - Losowy wybór:
       - podejście 1 (proste, Supabase RPC style): `order('random')` nie istnieje natywnie, ale można użyć `order('id', { foreignTable: ..., ... })` + losowy offset (dwustopniowo) lub funkcji SQL `random()` przez `rpc`.
       - podejście 2 (prostsze w MVP): SELECT z `order by random()` i `limit 1` przez pojedyncze zapytanie SQL (np. `rpc` lub `supabase.from('flashcards').select(...).order('random()')` jeśli dostępne; alternatywnie stworzyć widok/ funkcję w DB).
       - biorąc pod uwagę prostotę, w MVP można:
         - zrobić dwa zapytania:
           1. policzyć liczbę fiszek dla użytkownika + opcjonalnej kategorii,
           2. wygenerować losowy offset i pobrać `limit 1`.
     - Zwrócenie `FlashcardEntity | null`.

4. **Warstwa DB (Supabase)**:
   - Tabela: `public.flashcards`.
   - Minimalne zapytania:
     - policzenie liczby pasujących fiszek:

       - np. `supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', userId).maybeEq('category_id', categoryId);`
     - jeśli `count === 0` → `null`.
     - wylosowanie `offset = randomInt(0, count - 1)` i pobranie jednej fiszki:

       - `supabase.from('flashcards').select('*').eq('user_id', userId).maybeEq('category_id', categoryId).range(offset, offset);`

   - RLS gwarantuje, że użytkownik nie zobaczy cudzych fiszek, nawet jeśli w kodzie zabraknie filtra `user_id`.

5. **Backend → Klient**:
   - Jeśli `FlashcardEntity` istnieje:
     - mapowanie na `FlashcardDTO` (`Omit<FlashcardEntity, 'user_id'>`).
     - zwrot `200` z JSON-em.
   - Jeśli brak:
     - `404` z prostym komunikatem.

### 5. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - Wymagana sesja Supabase (`authenticated`).
  - Brak użytkownika (`auth.getUser()` zwraca błąd / `user = null`) → `401 Unauthorized`.

- **Autoryzacja i RLS**:
  - Tabela `flashcards` ma włączone RLS:
    - polityki wymuszają `user_id = auth.uid()`.
  - Backend nie przyjmuje `user_id` z klienta.
  - Ewentualne podanie `category_id` nie pozwoli obejść RLS – użytkownik i tak zobaczy tylko własne karty.

- **Walidacja danych**:
  - Query `category_id` walidowane jako UUID (Zod lub prosty check).
  - W przypadku niepoprawnego `category_id` → `400` (opcjonalne, ale zalecane).

- **Brak ekspozycji wrażliwych danych**:
  - DTO nie zawiera `user_id`.
  - Nie zwracamy informacji o liczbie fiszek użytkownika (tylko 404 / 200).

- **Rate limiting**:
  - Można rozważyć prosty limit żądań na endpoint, choć jest relatywnie tani (tylko odczyty z DB).

### 6. Obsługa błędów

- **Błędy walidacji query**:
  - `category_id` nie jest UUID:
    - Odpowiedź: `400 Bad Request`.
    - Body: `{ "error": "Invalid category_id" }`.

- **Brak autentykacji**:
  - Brak sesji / błąd auth:
    - `401 Unauthorized`.
    - Body: `{ "error": "Unauthorized" }`.

- **Brak fiszek**:
  - Po wykonaniu zapytań do DB `count === 0`:
    - `404 Not Found`.
    - Body: `{ "error": "No flashcards found" }`.

- **Błędy bazy danych**:
  - Problemy z zapytaniem (np. timeout, błąd połączenia):
    - Logowanie błędu (stdout / monitoring).
    - Odpowiedź: `500 Internal Server Error`.
    - Body: `{ "error": "Internal server error" }`.

- **Nieoczekiwane wyjątki**:
  - Globalny `try/catch` w handlerze:
    - loguje szczegóły po stronie serwera,
    - zwraca `500 Internal Server Error` z ogólnym komunikatem.

> Uwaga: ten endpoint nie loguje błędów do `generation_error_logs`, bo nie dotyczy generacji AI; klasyczne logowanie aplikacyjne (np. logger + monitoring) jest wystarczające.

### 7. Wydajność

- **Koszt operacji DB**:
  - Najprostsze podejście (count + losowy offset + select) to max dwa zapytania per request.
  - Dla większych wolumenów flashcards warto rozważyć:
    - indeksy (`flashcards_user_id_created_at_idx`, `flashcards_user_id_category_id_idx`) już są zaplanowane w `db-plan.md`,
    - ewentualny osobny indeks na `user_id, category_id`.

- **Losowość**:
  - `order by random()` na dużej tabeli może być kosztowne; dlatego zalecane jest podejście z losowym offsetem oparte na `count`.
  - Przy bardzo dużej liczbie fiszek można rozważyć:
    - cache’owanie ID w pamięci / Redis,
    - sampling w aplikacji zamiast w DB.

- **Rozmiar odpowiedzi**:
  - Jeden rekord – odpowiedź jest bardzo mała.

- **Skalowalność**:
  - Logika jest stateless (poza DB) → łatwa skalowalność horyzontalna.

### 8. Kroki implementacji

1. **Typy i walidacja**:
   - Upewnij się, że w `src/types.ts` istnieją:
     - `GetRandomFlashcardQueryDTO`
     - `GetRandomFlashcardResponseDTO` (= `FlashcardDTO`)
   - Utwórz schemat Zod dla query (np. `src/lib/validation/flashcards.ts`):
     - `category_id?: z.string().uuid()` lub `optional(z.string().uuid())`.

2. **Serwis `randomFlashcardService`**:
   - Utwórz `src/lib/services/randomFlashcardService.ts`.
   - Zaimplementuj funkcję:

     ```ts
     async function getRandomFlashcard({
       supabase,
       userId,
       categoryId,
     }): Promise<FlashcardEntity | null> { ... }
     ```

   - Zaimplementuj logikę:
     - policz liczbę fiszek (z filtrami),
     - jeśli 0 → `null`,
     - oblicz losowy offset,
     - pobierz kartę z `range(offset, offset)`.

3. **Handler API**:
   - Utwórz `src/pages/api/v1/flashcards/random.ts`.
   - W handlerze:
     - pobierz `context.locals.supabase`,
     - zweryfikuj użytkownika (`auth.getUser()`),
     - sparsuj i zweryfikuj query przez Zod,
     - wywołaj `randomFlashcardService.getRandomFlashcard`,
     - mapuj wynik:
       - `null` → `404`,
       - encja → `200` z `GetRandomFlashcardResponseDTO`.
     - w `catch` mapuj nieoczekiwane błędy na `500`.

4. **Konfiguracja środowiska**:
   - Endpoint korzysta tylko z Supabase (brak AI), więc wykorzystuje istniejące `SUPABASE_URL` i `SUPABASE_KEY`.

5. **Testy**:
   - Jednostkowe:
     - serwis zwraca `null` przy braku fiszek,
     - serwis zwraca jedną fiszkę przy dostępnych danych,
     - poprawne filtrowanie po `categoryId`.
   - Integracyjne:
     - `200` z poprawną fiszką,
     - `404` gdy użytkownik nie ma fiszek / w kategorii,
     - `401` bez sesji,
     - `400` przy niepoprawnym `category_id` (jeśli walidacja jest włączona).

6. **Monitorowanie**:
   - Dodaj metryki / logowanie:
     - liczba żądań,
     - udział 404 (brak fiszek),
     - ewentualne błędy 500.

7. **Optymalizacje (opcjonalnie)**:
   - Przy większych wolumenach:
     - rozważyć dedykowaną funkcję SQL (`rpc`) w Supabase, która zwraca losową fiszkę dla użytkownika,
     - ewentualnie zoptymalizować indeksy pod typowe zapytania tego endpointu.


