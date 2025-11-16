## API Endpoint Implementation Plan: GET /api/v1/flashcards

### 1. Przegląd punktu końcowego

Endpoint `GET /api/v1/flashcards` zwraca listę fiszek zalogowanego użytkownika, z opcjonalnym filtrowaniem po kategorii (`category_id`), paginacją (`limit`, `offset`) oraz sortowaniem (`order = created_desc | created_asc`).  
Służy do budowy list widoków fiszek (np. tabela, lista w UI), zapewniając pełną separację danych użytkowników dzięki RLS w Supabase.

---

### 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **URL**: `/api/v1/flashcards`
- **Autentykacja**: wymagana (Supabase token; middleware ustawia `context.locals.supabase`).

- **Parametry (query)**:
  - **Opcjonalne**:
    - `category_id: string (UUID)` – filtruje fiszki po konkretnej kategorii.
    - `limit: number` – liczba rekordów:
      - domyślnie: `50`
      - max: `200`
    - `offset: number` – offset od początku listy:
      - domyślnie: `0`
    - `order: string` – sortowanie:
      - domyślne: `created_desc`
      - dozwolone: `created_desc`, `created_asc`

- **Query DTO**:
  - `ListFlashcardsQueryDTO` (z `src/types.ts`):
    - `category_id?: FlashcardEntity['category_id'];`
    - `limit?: number;`
    - `offset?: number;`
    - `order?: FlashcardsOrder;` (`'created_desc' | 'created_asc'`)

- **Walidacja parametrów**:
  - `category_id`:
    - jeśli podane → musi być poprawnym UUID (np. Zod: `z.string().uuid()`),
    - w przeciwnym razie → `400 Bad Request`.
  - `limit`:
    - jeśli brak → ustaw `50`,
    - jeśli `< 1` lub `> 200` → `400 Bad Request`,
    - rzutowanie do integer (np. `parseInt` + walidacja).
  - `offset`:
    - jeśli brak → `0`,
    - jeśli `< 0` → `400 Bad Request`,
    - rzutowanie do integer.
  - `order`:
    - jeśli brak → `created_desc`,
    - jeśli nie jest jednym z `created_desc` / `created_asc` → `400 Bad Request`.

Walidację realizujemy Zod-em w handlerze (np. `listFlashcardsQuerySchema`).

---

### 3. Wykorzystywane typy

- **Encje (z `src/types.ts` / `database.types.ts`)**:
  - `FlashcardEntity` → `public.flashcards`
    - Kolumny: `id`, `user_id`, `category_id`, `front`, `back`, `source`, `created_at`, `updated_at`.

- **DTO / Typy pomocnicze**:
  - `FlashcardDTO = Omit<FlashcardEntity, 'user_id'>;`
  - `FlashcardsOrder = 'created_desc' | 'created_asc';`
  - `PaginationMetaDTO` (limit, offset, total).
  - `ListFlashcardsQueryDTO`
  - `ListFlashcardsResponseDTO extends PaginationMetaDTO`:
    - `items: FlashcardDTO[];`
    - `limit: number;`
    - `offset: number;`
    - `total: number | null;` (w MVP `null` – bez countowania).

DTO są bezpośrednio zbudowane z encji (`FlashcardEntity`) przy użyciu `Omit`, co zapewnia spójność ze schematem DB i minimalizuje duplikację informacji.

---

### 4. Szczegóły odpowiedzi

- **Sukces**:
  - `200 OK`
  - Body (`ListFlashcardsResponseDTO`):

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

- **Błędy**:
  - `400 Bad Request` – nieprawidłowe parametry query (np. zły UUID, limit/offset poza zakresem, nieznane `order`).
  - `401 Unauthorized` – brak autentykacji.
  - `500 Internal Server Error` – nieoczekiwane błędy po stronie serwera (DB, logika).

Zauważ, że brak `404` w tym endpointzie jest akceptowalny – pustą listę po prostu reprezentujemy jako `items: []` przy `200 OK`.

---

### 5. Przepływ danych

1. **Klient → Backend**:
   - Frontend (React/Astro) wykonuje `GET /api/v1/flashcards` z odpowiednimi parametrami query.
   - Dołącza token Supabase (nagłówek `Authorization` lub cookies).

2. **Middleware Astro**:
   - W `src/middleware/index.ts` inicjalizuje się `context.locals.supabase` przy użyciu `supabaseClient`.
   - Token jest przekazywany do Supabase clienta, co pozwala RLS-owi rozpoznać użytkownika.

3. **Handler API (Astro)**:
   - Docelowy plik: `src/pages/api/v1/flashcards/index.ts` (obsługa metod GET/POST; tutaj skupiamy się na `GET`).
   - Kroki:
     1. Pobierz `supabase` z `context.locals.supabase`.
     2. Zweryfikuj użytkownika:
        - `const { data: { user }, error } = await supabase.auth.getUser();`
        - brak użytkownika → `401 Unauthorized`.
     3. Odczytaj i sparsuj query z `request.url`.
     4. Zweryfikuj query za pomocą Zod (`listFlashcardsQuerySchema`) → `ListFlashcardsQueryDTO`:
        - w razie błędu → `400 Bad Request`.
     5. Wywołaj serwis:

        ```ts
        const result = await flashcardService.listFlashcards({
          supabase,
          userId: user.id,
          query: parsedQuery,
        });
        ```

     6. Zwróć `200 OK` z `result` w formacie `ListFlashcardsResponseDTO`.

4. **Serwis biznesowy (`flashcardService.listFlashcards`)**:
   - Nowy (lub istniejący) plik: `src/lib/services/flashcardService.ts`.
   - Funkcja:

     ```ts
     async function listFlashcards({
       supabase,
       userId,
       query,
     }): Promise<ListFlashcardsResponseDTO> { ... }
     ```

   - Logika:
     - Zbuduj zapytanie do `public.flashcards`:
       - filtruj po `user_id = userId` (dla przejrzystości; RLS i tak to wymusi),
       - jeśli `query.category_id` jest podane → `eq('category_id', query.category_id)`.
     - Sortowanie:
       - `created_desc` → `order('created_at', { ascending: false })`,
       - `created_asc` → `order('created_at', { ascending: true })`.
     - Paginacja:
       - `range(offset, offset + limit - 1)` zgodnie z `query.limit` i `query.offset`.
     - W MVP:
       - **nie** wykonujemy osobnego zapytania z `count`, ustawiamy `total: null`.
     - Zmapuj wynik (tablicę encji `FlashcardEntity`) na `FlashcardDTO[]` (`Omit<user_id>`).
     - Zwróć obiekt `ListFlashcardsResponseDTO`.

5. **Warstwa DB (Supabase)**:
   - Tabela: `public.flashcards`.
   - RLS:
     - `select` dozwolone tylko dla `user_id = auth.uid()`.
   - Zapytania wykonujemy przez Supabase client z kontekstem użytkownika; nie potrzebujemy przekazywać `user_id` w zapytaniu od klienta.

6. **Backend → Klient**:
   - Handler zwraca `200` z JSON-em zawierającym:
     - listę fiszek (`items`),
     - metadane paginacji (`limit`, `offset`, `total: null`).

---

### 6. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - Endpoint jest dostępny wyłącznie dla zalogowanych użytkowników (`authenticated` w Supabase).
  - Brak lub nieważny token → `401 Unauthorized`.

- **Autoryzacja / RLS**:
  - Tabela `flashcards` ma włączone RLS:
    - polityki zapewniają, że użytkownik widzi tylko własne fiszki (`user_id = auth.uid()`).
  - Backend nie przyjmuje `user_id` z query – ustala użytkownika wyłącznie z sesji Supabase.

- **Walidacja danych wejściowych**:
  - Query parametry są walidowane (UUID, zakresy liczb, enumeracje).
  - Zapobiega to:
    - zbędnym zapytaniom do DB przy ewidentnie błędnych danych,
    - potencjalnym atakom polegającym na przeciążeniu / wstrzyknięciu niepoprawnych wartości.

- **Brak wycieku danych wrażliwych**:
  - DTO nie ujawnia `user_id`.
  - Błędy zwracają ogólne komunikaty, bez szczegółów implementacyjnych (np. zapytań SQL).

---

### 7. Obsługa błędów

- **Niepoprawne query parametry**:
  - Przykłady:
    - `category_id` nie jest UUID,
    - `limit` < 1 lub > 200,
    - `offset` < 0,
    - `order` nie w {`created_desc`, `created_asc`}.
  - Odpowiedź:
    - `400 Bad Request`
    - Body: `{ "error": "Invalid query parameters" }` (opcjonalnie z polami `details`).

- **Brak autentykacji**:
  - `401 Unauthorized`
  - Body: `{ "error": "Unauthorized" }`.

- **Błędy bazy danych / wewnętrzne**:
  - Np. problemy z połączeniem, niespodziewane błędy Supabase.
  - Odpowiedź:
    - `500 Internal Server Error`
    - Body: `{ "error": "Internal server error" }`.
  - Szczegóły błędu logowane w logach serwera (stdout / monitoring).

> Uwaga: nie ma potrzeby logowania do `generation_error_logs`, ponieważ ten endpoint nie dotyczy generacji AI – wystarczy standardowe logowanie aplikacyjne.

---

### 8. Wydajność

- **Charakter zapytań**:
  - Operujemy na indeksach:
    - `flashcards_user_id_created_at_idx` – sortowanie po `created_at` z filtrem `user_id`.
    - `flashcards_user_id_category_id_idx` – filtrowanie po `user_id` i `category_id`.
  - `limit` max 200 → ogranicza ilość danych w odpowiedzi i obciążenie DB.

- **Brak `total`**:
  - `total: null` w odpowiedzi pozwala uniknąć kosztownych zapytań `count(*)`.
  - W przyszłości można dodać opcjonalny parametr włączający liczenie `total`.

- **Skalowalność**:
  - Logika endpointu jest stateless w warstwie aplikacji → łatwa skalowalność pozioma.
  - Utrzymanie wąskiego DTO (`FlashcardDTO`) minimalizuje rozmiar odpowiedzi.

- **Możliwe optymalizacje w przyszłości**:
  - Cache wyników dla wybranych filtrów (np. dla popularnych kategorii).
  - Paginated cursors zamiast `offset` (przy bardzo dużych zbiorach danych).

---

### 9. Kroki implementacji

1. **Typy / DTO**:
   - Zweryfikuj obecne definicje w `src/types.ts`:
     - `FlashcardDTO`
     - `ListFlashcardsQueryDTO`
     - `ListFlashcardsResponseDTO`
     - `FlashcardsOrder`
   - W razie potrzeby doprecyzuj te typy (obecnie są już poprawnie zdefiniowane).

2. **Walidacja (Zod)**:
   - Utwórz / uzupełnij `src/lib/validation/flashcards.ts`:

     ```ts
     const listFlashcardsQuerySchema = z.object({
       category_id: z.string().uuid().optional(),
       limit: z
         .string()
         .transform((v) => parseInt(v, 10))
         .optional()
         .refine((v) => v === undefined || (v >= 1 && v <= 200), 'limit out of range'),
       offset: z
         .string()
         .transform((v) => parseInt(v, 10))
         .optional()
         .refine((v) => v === undefined || v >= 0, 'offset must be >= 0'),
       order: z.enum(['created_desc', 'created_asc']).optional(),
     });
     ```

   - W handlerze:
     - Sparsuj `URLSearchParams` do zwykłego obiektu,
     - przepuść przez schema,
     - ustaw wartości domyślne (`limit`, `offset`, `order`).

3. **Serwis `flashcardService.listFlashcards`**:
   - Dodaj (lub uzupełnij) w `src/lib/services/flashcardService.ts`:
     - implementację zapytania do Supabase wg sekcji „Przepływ danych”.

4. **Handler API**:
   - Utwórz / edytuj `src/pages/api/v1/flashcards/index.ts`:
     - obsłuż metodę `GET`:
       - auth,
       - walidacja query,
       - wywołanie serwisu,
       - mapowanie wyniku do `ListFlashcardsResponseDTO`,
       - zwrot `200`.
     - Zaimplementuj jednolity mechanizm obsługi błędów (mapowanie wyjątków na `400/401/500`).

5. **Konfiguracja środowiska**:
   - Korzysta tylko z istniejących zmiennych Supabase (`SUPABASE_URL`, `SUPABASE_KEY`); brak dodatkowej konfiguracji.

6. **Monitorowanie / logowanie**:
   - Zapewnij logowanie nieoczekiwanych błędów (DB / runtime) oraz ewentualnych anomalii (np. nietypowe wzorce użycia).


