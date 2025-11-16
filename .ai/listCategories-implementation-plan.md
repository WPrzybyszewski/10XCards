## API Endpoint Implementation Plan: GET `/api/v1/categories`

## 1. Przegląd punktu końcowego

- **Cel**: Zwrócenie listy wszystkich kategorii należących do aktualnie uwierzytelnionego użytkownika, z obsługą prostego stronicowania (limit + offset).
- **Zakres danych**: Każdy element listy to publiczna reprezentacja kategorii (bez `user_id`), zawierająca `id`, `name`, `created_at`, `updated_at`.
- **Charakterystyka**:
  - Endpoint tylko do odczytu (HTTP `GET`).
  - Zwraca dane zawężone do jednego użytkownika dzięki Supabase RLS.
  - Parametry `limit` i `offset` pozwalają na paginację wyników.
  - Pole `total` w MVP zawsze `null` (brak dodatkowego zapytania `count`).

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **URL**: `/api/v1/categories`
- **Nagłówki**:
  - `Authorization: Bearer <access_token>` – **wymagany** w docelowej wersji (Supabase access token).
  - (Dev/MVP może tymczasowo używać zahardkodowanego `userId`, analogicznie do istniejących endpointów AI – patrz kroki implementacji).
- **Parametry zapytania (query)**:
  - **Opcjonalne**:
    - `limit`: liczba całkowita, domyślnie `100`, maksimum `500`.
    - `offset`: liczba całkowita, domyślnie `0`, minimum `0`.
- **Body**:
  - Brak (zgodnie ze specyfikacją).

### 2.1. Parametry – wymagane vs opcjonalne

- **Wymagane (logicznie)**:
  - Token uwierzytelniający (nagłówek `Authorization`) – w docelowej wersji.
- **Opcjonalne**:
  - `limit`, `offset` – jeżeli niepodane, stosujemy wartości domyślne (`100` i `0`).

## 3. Wykorzystywane typy

### 3.1. Istniejące typy (z `src/types.ts`)

- **Entity alias**:
  - `CategoryEntity = Tables<"categories">`
- **DTO**:
  - `CategoryDTO = Omit<CategoryEntity, "user_id">`
  - `ListCategoriesResponseDTO`:
    - `items: CategoryDTO[]`
    - `limit: number`
    - `offset: number`
    - `total: number | null`
- **Query DTO**:
  - `ListCategoriesQueryDTO`:
    - `limit?: number`
    - `offset?: number`

### 3.2. Nowe typy / kontrakty wewnętrzne

Nie ma potrzeby wprowadzania nowych Command modeli (endpoint jest tylko do odczytu), ale dla spójności z innymi endpointami można:

- **Walidacja query** (w warstwie Zod):
  - `ListCategoriesQueryInput` – `z.infer` z nowego schematu Zod dla parametrów zapytania.
- **Kontrakt serwisu**:
  - `ListCategoriesParams`:
    - `supabase: SupabaseClient`
    - `userId: string` (opcjonalnie – jeżeli w przyszłości będziemy filtrować po `user_id` jawnie, a nie tylko przez RLS).
    - `limit: number`
    - `offset: number`

## 4. Szczegóły odpowiedzi

### 4.1. Sukces `200 OK`

- **Status**: `200 OK`
- **Body (JSON)**:

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

- **Uwagi**:
  - `items` zawiera tylko rekordy widoczne dla użytkownika zgodnie z RLS (czyli jego własne kategorie).
  - `total` w MVP jest zawsze `null` (brak kosztownych zapytań `count(*)`).

### 4.2. Struktura błędów

Dla spójności z innymi endpointami (np. AI) stosujemy zunifikowany format błędów:

```json
{
  "error": "Bad Request",
  "message": "limit must be between 1 and 500.",
  "details": {
    "field": "limit"
  }
}
```

- **Pola**:
  - `error`: krótka etykieta oparta o status HTTP (`"Bad Request"`, `"Unauthorized"`, `"Internal Server Error"`).
  - `message`: ludzki opis błędu.
  - `details`: obiekt z dodatkowymi informacjami (np. `field`, `issues` z Zod) – opcjonalny.

### 4.3. Kody statusu HTTP

- `200 OK` – lista kategorii poprawnie zwrócona.
- `400 Bad Request` – nieprawidłowe parametry query (np. `limit` < 1, `limit` > 500, `offset` < 0, niepoprawny typ).
- `401 Unauthorized` – brak/nieprawidłowy token Supabase (w docelowej wersji).
- `500 Internal Server Error` – niespodziewany błąd serwera lub bazy.

## 5. Przepływ danych

### 5.1. Przepływ wysokopoziomowy

1. Klient wywołuje `GET /api/v1/categories`:
   - w docelowej wersji z nagłówkiem `Authorization: Bearer <access_token>`.
   - w dev/MVP może być brak realnego tokena – backend może używać tymczasowo zahardkodowanego `userId` (analogicznie do endpointów AI), ale jest to tylko wariant przejściowy.
2. Żądanie trafia do endpointu Astro w `src/pages/api/v1/categories/index.ts`.
3. Middleware (`src/middleware/index.ts`) dołącza `context.locals.supabase`.
4. Endpoint:
   - Odczytuje `supabase` z `locals`.
   - (Docelowo) pobiera użytkownika z Supabase Auth (np. `supabase.auth.getUser(accessToken)` lub odpowiednikiem).
   - Odczytuje `limit` i `offset` z `request.url` (`URLSearchParams`).
   - Waliduje parametry query za pomocą Zod.
   - Buduje obiekt parametru dla serwisu (limit, offset, ew. userId).
   - Wywołuje serwis domenowy `listCategories`.
5. Serwis:
   - Wykonuje zapytanie do tabeli `categories` z uwzględnieniem `limit` i `offset`.
   - RLS na `categories` zapewnia, że widoczne są tylko rekordy użytkownika (`user_id = auth.uid()`).
   - Zwraca listę kategorii jako `CategoryDTO[]`.
   - Serwis nie wylicza `total` – w MVP zwracamy `null`.
6. Endpoint opakowuje wynik w `ListCategoriesResponseDTO` i zwraca `200 OK`.

### 5.2. Szczegóły interakcji z bazą danych

- Zapytanie w serwisie:
  - Tabela: `categories`.
  - Kolumny: przynajmniej `id`, `name`, `created_at`, `updated_at`.
  - Zapytanie:
    - `.from("categories").select("id, name, created_at, updated_at")`
    - `.order("created_at", { ascending: true })` (opcjonalnie dla deterministycznej kolejności).
    - `.range(offset, offset + limit - 1)` lub `.limit(limit).offset(offset)` (w zależności od preferencji i API Supabase).
- RLS (zdefiniowany w planie DB) zapewnia filtr po `user_id = auth.uid()`, więc nie musimy przyjmować `user_id` z zewnątrz.
- Brak logowania do dedykowanej tabeli błędów (jak `generation_error_logs`) – ewentualne błędy logujemy w konsoli serwera.

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie

- Docelowo endpoint wymaga ważnego tokena Supabase:
  - `Authorization: Bearer <access_token>`.
- Backend:
  - Używa Supabase server clienta z middleware (`context.locals.supabase`).
  - Weryfikuje token przez `supabase.auth.getUser()` (w przyszłym wdrożeniu).
- W dev/MVP można (tak jak w endpointach AI) tymczasowo używać zahardkodowanego `userId`, ale:
  - To rozwiązanie tymczasowe.
  - Powinno być wyraźnie oznaczone w komentarzach i usunięte przed produkcją.

### 6.2. Autoryzacja i RLS

- Tabela `categories` ma włączone RLS:
  - Role `authenticated` mogą czytać tylko wiersze z `user_id = auth.uid()`.
  - Role `anon` nie mają dostępu (`using (false)`).
- Endpoint nie przyjmuje `user_id` z zewnątrz – własność zasobów jest pośrednio wyznaczana przez `auth.uid()` w RLS.
- Dzięki RLS:
  - Próba odczytu kategorii innego użytkownika jest po prostu niewidoczna – dane nie wyciekają.

### 6.3. Walidacja wejścia

- Walidacja parametrów `limit` i `offset` za pomocą Zod:
  - `limit`:
    - domyślnie `100`,
    - `1 <= limit <= 500`.
  - `offset`:
    - domyślnie `0`,
    - `offset >= 0`.
- Odrzucanie niepoprawnych wartości (`400 Bad Request`) ogranicza możliwość DoS poprzez ekstremalne wartości parametru (np. `limit=999999`).

### 6.4. Zagrożenia bezpieczeństwa i ich mitigacja

- **Brak autoryzacji**:
  - Bez ważnego tokena użytkownik nie powinien otrzymać żadnych danych (`401`).
- **Wycieki danych między użytkownikami**:
  - RLS + brak `user_id` w API uniemożliwia odczyt cudzych rekordów.
- **Brute force / scraping**:
  - Limitujemy `limit` do maks. `500`.
  - Produkcyjnie można dodać rate limiting na poziomie infrastruktury (np. per IP / per user).

## 7. Obsługa błędów

### 7.1. Scenariusze błędów wejścia (`400 Bad Request`)

- `limit` lub `offset`:
  - niepoprawny typ (np. tekst niebędący liczbą),
  - `limit` < 1 lub > 500,
  - `offset` < 0.

**Odpowiedź**:

- `400 Bad Request` z ciałem:

```json
{
  "error": "Bad Request",
  "message": "limit must be between 1 and 500.",
  "details": {
    "field": "limit"
  }
}
```

### 7.2. Brak autoryzacji (`401 Unauthorized`)

(Docelowo, po wdrożeniu realnego uwierzytelniania)

- Brak nagłówka `Authorization`.
- Nieprawidłowy lub wygasły token Supabase.
- `supabase.auth.getUser()` zwraca błąd lub `user = null`.

**Odpowiedź**:

- `401 Unauthorized` z ciałem:

```json
{
  "error": "Unauthorized",
  "message": "Authentication required."
}
```

### 7.3. Błędy serwera (`500 Internal Server Error`)

- Niespodziewane błędy Supabase (np. niedostępna baza).
- Błędy w komunikacji z bazą danych (np. naruszenie constraints, problemy z RLS).
- Inne wyjątki w kodzie serwisu lub endpointu.

**Odpowiedź**:

- `500 Internal Server Error` z ciałem:

```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong. Please try again later."
}
```

- Szczegóły błędu są logowane po stronie backendu (np. `console.error`), ale nie wysyłane do klienta.
- Brak logowania do specjalnej tabeli błędów (ta funkcjonalność jest zarezerwowana dla generatora AI).

## 8. Rozważania dotyczące wydajności

- **Koszt DB**:
  - Endpoint wykonuje jedno proste zapytanie `select` z `limit` i `offset` po indeksowanej kolumnie `user_id` (i ewentualnie `created_at`).
  - Brak zapytań `count(*)` w MVP (`total` = `null`).
- **Indeksy**:
  - Zakłada się indeks na `categories(user_id, created_at)` lub podobny – wystarczający do szybkich odczytów.
- **Minimalizacja danych**:
  - Selekcjonujemy tylko kolumny potrzebne w DTO (`id`, `name`, `created_at`, `updated_at`), bez `user_id`.
- **Skalowalność**:
  - Dzięki limitowaniu wyników do maks. `500` rekordów endpoint dobrze skaluje się nawet przy większej liczbie kategorii w bazie.
- **Brak dodatkowych zapytań**:
  - Nie liczymy `total`, co upraszcza implementację i zmniejsza obciążenie bazy.

## 9. Etapy wdrożenia

### 9.1. Typy i walidacja

1. **Zweryfikuj istniejące typy** w `src/types.ts`:
   - Upewnij się, że `CategoryDTO`, `ListCategoriesQueryDTO` i `ListCategoriesResponseDTO` są zgodne ze specyfikacją.
2. **Dodaj schemat Zod** dla parametrów zapytania w nowym lub istniejącym pliku, np. `src/lib/validation/categories.ts`:
   - `listCategoriesQuerySchema`:
     - Przyjmuje `limit` i `offset` jako `string | undefined` (z `URLSearchParams`).
     - Transformuje na liczby z domyślnymi wartościami (`100` i `0`).
     - Waliduje zakres (`1–500` dla `limit`, `>= 0` dla `offset`).
   - Eksportuj typ `ListCategoriesQueryInput` jako `z.infer<typeof listCategoriesQuerySchema>`.

### 9.2. Warstwa serwisowa

3. **Utwórz serwis** w `src/lib/services/categoryService.ts` (jeśli nie istnieje):
   - Funkcja:
     - `listCategories(params: ListCategoriesParams): Promise<CategoryDTO[]>`.
   - Implementacja:
     - Przyjmuje `supabase`, `limit`, `offset` (opcjonalnie także `userId`).
     - Wykonuje zapytanie:
       - `.from("categories").select("id, name, created_at, updated_at")`.
       - `.order("created_at", { ascending: true })`.
       - `.range(offset, offset + limit - 1)` lub `.limit(limit).offset(offset)`.
     - Obsługuje błędy:
       - W razie błędu rzuca kontrolowany wyjątek (np. zwykły `Error` lub dedykowany typ domenowy).
   - Serwis nie liczy `total` – endpoint sam ustawia `total: null`.

### 9.3. Endpoint Astro

4. **Utwórz endpoint** w `src/pages/api/v1/categories/index.ts`:
   - Eksport `GET` zgodny z typem `APIRoute` / `APIContext` (jak w innych endpointach).
   - Kroki:
     1. Odczyt `locals.supabase`.
     2. (Docelowo) odczyt i walidacja tokena z nagłówka `Authorization`, wywołanie `supabase.auth.getUser()`, obsługa `401`.
        - W dev/MVP można tymczasowo pominąć ten krok i oprzeć się na zahardkodowanym `userId`, zgodnie z dotychczasowym podejściem.
     3. Odczyt parametrów query z `context.url.searchParams`.
     4. Walidacja parametrów przez `listCategoriesQuerySchema.safeParse`.
        - W przypadku błędu – odpowiedź `400` z zunifikowanym formatem błędów.
     5. Wywołanie serwisu `listCategories` z `supabase`, `limit`, `offset` (i ewentualnie `userId`).
     6. Zmapowanie wyniku na `ListCategoriesResponseDTO` z `total: null`.
     7. Zwrócenie `200 OK` z JSON.
   - Obsługa błędów:
     - Błędy walidacji query → `400 Bad Request`.
     - Błędy uwierzytelnienia (docelowo) → `401 Unauthorized`.
     - Błędy DB / niespodziewane → `500 Internal Server Error` + logowanie poprzez `console.error`.

### 9.4. Ujednolicenie formatów i dokumentacja

5. **Ujednolić format błędów**:
   - Upewnić się, że endpoint korzysta z tych samych helperów do odpowiedzi (`createJsonResponse`, `createErrorResponse`) co inne endpointy backendu (np. AI).
6. **Dodać komentarze dokumentacyjne**:
   - W endpointzie i serwisie krótko opisać funkcję, oczekiwane parametry oraz powody braku `total` w MVP.


