## API Endpoint Implementation Plan: POST `/api/v1/flashcards/accept`

## 1. Przegląd punktu końcowego

- **Cel**: Zatwierdzenie wybranej propozycji fiszki wygenerowanej przez AI (z opcjonalnymi edycjami po stronie użytkownika) i zapisanie jej jako nową fiszkę w tabeli `flashcards`.
- **Kluczowe działania biznesowe**:
  - Walidacja powiązania `generation_id` ↔ `proposal_id` oraz własności zasobów przez zalogowanego użytkownika.
  - Walidacja `category_id` (istnienie + własność użytkownika).
  - Walidacja treści `front` i `back` względem limitów długości.
  - Utworzenie fiszki z `source = "ai"`.
  - Aktualizacja wiersza `generation_proposals` (`accepted_at`, `flashcard_id`).
- **Kontrakt HTTP**:
  - **Metoda**: `POST`
  - **Ścieżka**: `/api/v1/flashcards/accept`
  - **Status sukcesu**: `201 Created`
  - **Błędy**: `400`, `401`, `404`, `409`, `500` zgodnie ze specyfikacją API.

## 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **URL**: `/api/v1/flashcards/accept`
- **Nagłówki**:
  - **`Authorization: Bearer <access_token>`** – wymagany, Supabase access token.
  - **`Content-Type: application/json`** – wymagany.

### 2.1. Parametry

- **Parametry ścieżki**:
  - Brak.

- **Parametry zapytania (query)**:
  - Brak.

- **Parametry w body (JSON)**:
  - **Wymagane**:
    - **`generation_id`**: `string` (UUID)
      - Identyfikator rekordu w `generations`.
      - Musi należeć do zalogowanego użytkownika (pośrednio przez `user_id`).
    - **`proposal_id`**: `string` (UUID)
      - Identyfikator rekordu w `generation_proposals`.
      - Musi wskazywać propozycję powiązaną z `generation_id`.
    - **`category_id`**: `string` (UUID)
      - Identyfikator kategorii w `categories`.
      - Musi istnieć i należeć do użytkownika.
    - **`front`**: `string`
      - Treść pytania; po `trim()` długość od 1 do 200 znaków.
    - **`back`**: `string`
      - Treść odpowiedzi; po `trim()` długość od 1 do 500 znaków.
  - **Opcjonalne**:
    - Brak – wszystkie pola z kontraktu są wymagane, ale `front`/`back` są traktowane jako „edytowalne” względem propozycji.

### 2.2. Walidacja danych wejściowych

Walidacja powinna być zrealizowana za pomocą **Zod** w dedykowanym schemacie, np. `acceptFlashcardProposalSchema`.

- **Kroki walidacji**:
  - Sprawdzenie, czy body jest poprawnym JSON-em; w razie błędu – `400 Bad Request`.
  - Walidacja kształtu:
    - `generation_id`, `proposal_id`, `category_id` jako prawidłowe UUID (string, format UUID).
    - `front` i `back` jako stringi.
  - Normalizacja treści:
    - `.transform((s) => s.trim())` dla `front`, `back`.
  - Walidacja długości:
    - `1 <= length(front) <= 200`
    - `1 <= length(back) <= 500`
  - W przypadku dowolnego naruszenia – zwrot `400 Bad Request` z opisem błędu.

### 2.3. Mapowanie na Command model

Po przejściu walidacji JSON powinien zostać zmapowany na **Command model**:

- **`AcceptFlashcardProposalCommand`** (z `src/types.ts`):
  - `generation_id: GenerationId`
  - `proposal_id: GenerationProposalId`
  - `category_id: FlashcardEntity['category_id']`
  - `front: FlashcardEntity['front']`
  - `back: FlashcardEntity['back']`

Komenda powinna być jedynym wejściem do warstwy serwisowej dla tego endpointu.

## 3. Wykorzystywane typy

### 3.1. Istniejące typy (z `src/types.ts`)

- **Encje (DB row aliases)**:
  - `CategoryEntity = Tables<'categories'>`
  - `FlashcardEntity = Tables<'flashcards'>`
  - `GenerationEntity = Tables<'generations'>`
  - `GenerationProposalEntity = Tables<'generation_proposals'>`
  - `GenerationErrorLogEntity = Tables<'generation_error_logs'>` (tu raczej nieużywany).

- **Alias ID**:
  - `CategoryId`
  - `FlashcardId`
  - `GenerationId`
  - `GenerationProposalId`

- **DTO/Command dla generatora**:
  - `AcceptFlashcardProposalCommand` – opisany wyżej.
  - `AcceptFlashcardProposalResponseDTO`:
    - `{ flashcard: FlashcardDTO }`
  - `FlashcardDTO = Omit<FlashcardEntity, 'user_id'>`

### 3.2. Nowe typy i kontrakty wewnętrzne

- **Kontekst serwisu** (propozycja, wewnętrzny typ):
  - `AcceptFlashcardProposalContext`:
    - `supabase: SupabaseClient<Database>` – z `context.locals.supabase`.
    - `userId: string` – `auth.uid()` z Supabase.

- **Wewnętrzny wynik serwisu**:
  - Zazwyczaj można użyć po prostu `FlashcardEntity` lub `FlashcardDTO`, ale dla przejrzystości:
    - `AcceptFlashcardProposalResult = FlashcardDTO`

- **Struktura błędu domenowego** (opcjonalnie, dla spójnego mapowania na HTTP):
  - `DomainError`:
    - `type: 'ValidationError' | 'NotFound' | 'Conflict' | 'Unauthorized' | 'Unknown'`
    - `message: string`
    - `details?: Record<string, unknown>`

Te typy nie muszą być wszystkie jawnie zadeklarowane w kodzie, ale plan zakłada ich konceptualne istnienie, aby ułatwić mapowanie logiki na HTTP.

## 4. Szczegóły odpowiedzi

### 4.1. Sukces `201 Created`

- **Status**: `201 Created`
- **Body (JSON)**:

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

- **Uwagi implementacyjne**:
  - Pole `source` **zawsze** ustawiane po stronie backendu na `"ai"`, ignorujemy ewentualne pole `source` w wejściu (w ogóle go nie przyjmujemy).
  - Timestamps (`created_at`, `updated_at`) są generowane przez bazę (`default now()` + triggery `updated_at`).

### 4.2. Struktura błędów (propozycja)

Dla spójności API warto przyjąć ujednolicony format błędu:

```json
{
  "error": "Bad Request",
  "message": "front must be between 1 and 200 characters after trimming.",
  "details": {
    "field": "front"
  }
}
```

- **Pola**:
  - `error`: krótka etykieta oparta o status HTTP (`"Bad Request"`, `"Unauthorized"`, `"Not Found"`, `"Conflict"`, `"Internal Server Error"`).
  - `message`: ludzki opis błędu.
  - `details`: obiekt z dodatkowymi informacjami (opcjonalny).

### 4.3. Kody statusu HTTP

- **`201 Created`** – poprawne utworzenie fiszki na podstawie propozycji.
- **`400 Bad Request`** – nieprawidłowy JSON, brak wymaganych pól, niezgodność typów, przekroczenie limitów długości lub błędny format UUID.
- **`401 Unauthorized`** – brak/nieprawidłowy token Supabase lub brak zalogowanego użytkownika.
- **`404 Not Found`** – `generation`, `proposal` lub `category` nie istnieje lub nie należy do użytkownika (zawsze agregujemy do 404, nie ujawniamy szczegółów).
- **`409 Conflict`** – propozycja została już wcześniej zaakceptowana (`accepted_at` nie jest `null` lub `flashcard_id` już ustawione).
- **`500 Internal Server Error`** – nieoczekiwany błąd serwera/DB/Supabase.

## 5. Przepływ danych

### 5.1. Przepływ wysokopoziomowy

1. Klient (frontend) wywołuje `POST /api/v1/flashcards/accept` z tokenem Supabase i body zgodnym ze specyfikacją.
2. Żądanie trafia do endpointu Astro w `src/pages/api/v1/flashcards/accept.ts`.
3. Middleware (`src/middleware/index.ts`) podłącza `context.locals.supabase`.
4. Endpoint:
   - Odczytuje `supabase` z `locals`.
   - Pobiera aktualnego użytkownika (`supabase.auth.getUser()` lub równoważna metoda).
   - Waliduje body za pomocą Zod.
   - Tworzy `AcceptFlashcardProposalCommand`.
   - Wywołuje serwis domenowy `acceptFlashcardProposal(context, command)`.
5. Serwis:
   - Waliduje istnienie i własność `category_id`.
   - Waliduje istnienie `generation_id` i jego własność.
   - Waliduje istnienie `proposal_id`, jego powiązanie z `generation_id` i brak wcześniejszej akceptacji.
   - Tworzy nowy rekord w `flashcards` z `source = 'ai'`.
   - Aktualizuje odpowiedni wiersz `generation_proposals` (`accepted_at`, `flashcard_id`).
   - Zwraca `FlashcardDTO`.
6. Endpoint mapuje wynik serwisu na `AcceptFlashcardProposalResponseDTO` i odpowiada `201 Created`.

### 5.2. Szczegóły interakcji z bazą danych

Zakładając użycie Supabase (RLS + typowy SupabaseClient):

- **Kroki DB** (w serwisie):
  1. **Pobranie użytkownika**:
     - `const { data: { user } } = await supabase.auth.getUser();`
     - Jeśli `user` jest `null` → `401`.
  2. **Walidacja kategorii**:
     - Zapytanie do `categories` z RLS:
       - `from('categories').select('id').eq('id', category_id).maybeSingle()`
     - RLS (`user_id = auth.uid()`) zapewnia, że nie pobierzemy cudzej kategorii.
     - Brak rekordu → `404`.
  3. **Walidacja generacji**:
     - Zapytanie do `generations`:
       - `from('generations').select('id').eq('id', generation_id).maybeSingle()`
     - RLS zapewnia własność; brak rekordu → `404`.
  4. **Walidacja propozycji**:
     - Zapytanie do `generation_proposals`:
       - `from('generation_proposals').select('id, generation_id, flashcard_id, accepted_at').eq('id', proposal_id).maybeSingle()`
     - RLS oparte na `exists` w `generations` zapewnia, że widzimy tylko własne propozycje.
     - Jeśli `proposal.generation_id !== generation_id` → traktujemy jak `404` (ukrywamy szczegóły).
     - Jeśli `accepted_at` nie jest `null` lub `flashcard_id` nie jest `null` → `409 Conflict`.
  5. **Utworzenie fiszki**:
     - `insert` do `flashcards`:
       - `user_id = auth.uid()` (może być ustawiony jawnie albo polegamy na RLS + `with check`).
       - `category_id = command.category_id`
       - `front = command.front`
       - `back = command.back`
       - `source = 'ai'`
     - Zwracamy utworzony wiersz (`select().single()`) i mapujemy go na `FlashcardDTO`.
  6. **Aktualizacja propozycji**:
     - `update` na `generation_proposals`:
       - `accepted_at = now()`
       - `flashcard_id = new_flashcard.id`
       - `where id = proposal_id`
     - Jeśli aktualizacja nie powiedzie się po utworzeniu fiszki:
       - Opcja MVP: zostawiamy fiszkę w bazie (niewiązana propozycja) i zwracamy `500`, a błąd logujemy (systemowo, niekoniecznie w `generation_error_logs`).
       - W przyszłości: migracja z funkcją SQL, która wykona insert + update w jednej transakcji.

RLS opisany w `db-plan.md` zapewnia, że wszystkie operacje są zawężone do rekordu bieżącego użytkownika.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - Endpoint wymaga ważnego tokena Supabase (`Authorization: Bearer ...`).
  - Każde żądanie zaczynamy od sprawdzenia użytkownika (`supabase.auth.getUser()`).
- **Autoryzacja i RLS**:
  - Nie przyjmujemy `user_id` z zewnątrz – własność zasobów wynika z `auth.uid()`.
  - RLS na tabelach (`categories`, `flashcards`, `generations`, `generation_proposals`) ogranicza dane do użytkownika.
  - Wszelkie brakujące lub cudze zasoby są mapowane na `404 Not Found`.
- **Walidacja wejścia**:
  - Zod eliminuje błędne typy i formaty (np. niepoprawny UUID).
  - Przycinanie (`trim()`) i limity długości zabezpieczają przed bardzo długimi ciągami i niechcianymi białymi znakami.
- **Ukrywanie szczegółów wewnętrznych**:
  - Nie ujawniamy, czy konkretne `generation_id` lub `proposal_id` istnieją ani czy należą do użytkownika – zawsze `404`.
  - W odpowiedziach błędów nie zwracamy SQL-owych szczegółów czy stack trace’ów.
- **Rate limiting**:
  - Zgodnie z planem API, endpoint powinien być objęty podstawowym limitowaniem (per IP / per user), szczególnie w środowisku produkcyjnym.
  - Implementacja zależy od warstwy infrastruktury (np. reverse proxy, edge functions) – uwzględnić w konfiguracji.
- **Integralność danych**:
  - Klucze obce (`generation_proposals.flashcard_id`, `flashcards.category_id`) i constrainty w DB zapobiegają niespójnościom.
  - Sprawdzamy, że jedna propozycja nie zostanie zaakceptowana wielokrotnie (logika + ewentualny unikalny constraint w przyszłości).

## 7. Obsługa błędów

### 7.1. Scenariusze błędów wejścia (`400 Bad Request`)

- Niepoprawny JSON lub brak `Content-Type: application/json`.
- Brak któregokolwiek z wymaganych pól: `generation_id`, `proposal_id`, `category_id`, `front`, `back`.
- Pole niezgodne typowo (np. liczba zamiast stringa).
- Niepoprawny format UUID (`generation_id`, `proposal_id`, `category_id`).
- `front` po `trim()` ma długość 0 lub > 200.
- `back` po `trim()` ma długość 0 lub > 500.

**Odpowiedź**: `400 Bad Request` z opisem błędu i wskazaniem pola w `details`.

### 7.2. Brak autoryzacji (`401 Unauthorized`)

- Brak nagłówka `Authorization`.
- Nieprawidłowy lub wygasły token Supabase.
- `supabase.auth.getUser()` zwraca `null` lub błąd autoryzacji.

**Odpowiedź**: `401 Unauthorized` z komunikatem typu `"Authentication required."`.

### 7.3. Brak zasobów lub brak własności (`404 Not Found`)

- `categories.id = category_id` nie istnieje lub nie jest widoczne przez RLS (czyli nie należy do użytkownika).
- `generations.id = generation_id` nie istnieje lub należy do innego użytkownika.
- `generation_proposals.id = proposal_id` nie istnieje lub poprzez RLS jest niewidoczne.
- `proposal.generation_id !== generation_id` – błąd spójności wejścia.

**Odpowiedź**: `404 Not Found` z ogólnym komunikatem `"Generation, proposal or category not found."`.

### 7.4. Konflikt (`409 Conflict`)

- Propozycja została już zaakceptowana:
  - `accepted_at` nie jest `null` lub
  - `flashcard_id` ma już wartość.

**Odpowiedź**: `409 Conflict` z komunikatem `"Proposal already accepted."`.

### 7.5. Błędy serwera (`500 Internal Server Error`)

- Nieoczekiwane błędy Supabase (np. niedostępna baza).
- Błędy w komunikacji z bazą (np. naruszenie constraintów, których nie przewidzieliśmy na poziomie aplikacji).
- Inne wyjątki w kodzie serwisu lub endpointu.

**Odpowiedź**:

- `500 Internal Server Error` z komunikatem `"Something went wrong. Please try again later."`.
- Szczegóły błędu są logowane w systemie logowania backendu (np. konsola, APM, logi serwera), ale **nie** w `generation_error_logs` (ta tabela jest przeznaczona do błędów generacji AI, a nie do akceptacji propozycji).

## 8. Rozważania dotyczące wydajności

- **Koszt DB**:
  - Endpoint wykonuje kilka prostych zapytań (`select` + `insert` + `update`) na indeksowanych kolumnach (`id`, `generation_id`, `user_id`), więc koszt jest niski.
- **Indeksy**:
  - `flashcards_user_id_created_at_idx`, `generation_proposals_generation_id_idx` i PK na `id` wystarczają do szybkich lookupów.
- **Minimalizacja danych**:
  - W zapytaniach `select` pobieramy tylko niezbędne kolumny (`id`, `generation_id`, `accepted_at`, `flashcard_id`), aby ograniczyć payload i czas serializacji.
- **Skalowalność**:
  - Endpoint jest wywoływany rzadziej niż generowanie (`/generate`), więc nie powinien stanowić wąskiego gardła.
- **Transakcyjność**:
  - MVP: dwa osobne zapytania (`insert` fiszki, potem `update` propozycji).
  - Możliwe rozszerzenie: funkcja SQL (`rpc`) realizująca oba kroki w jednej transakcji, jeśli w przyszłości będzie to wymagane.

## 9. Etapy wdrożenia

### 9.1. Walidacja i typy

1. **Zweryfikuj typy** w `src/types.ts`:
   - `AcceptFlashcardProposalCommand` oraz `AcceptFlashcardProposalResponseDTO` już istnieją i są zgodne ze specyfikacją.
2. **Dodaj schemat Zod** (np. w nowym pliku `src/lib/validation/flashcards.ts`):
   - `acceptFlashcardProposalSchema` opisujący body żądania zgodnie z sekcją 2.2.
   - Eksportuj funkcję pomocniczą, która:
     - Parsuje `request.json()`.
     - Zwraca `AcceptFlashcardProposalCommand` lub rzuca błąd walidacji.

### 9.2. Warstwa serwisowa

3. **Utwórz serwis** w `src/lib/flashcards.service.ts` (jeśli jeszcze nie istnieje):
   - Funkcja:
     - `acceptFlashcardProposal(context: AcceptFlashcardProposalContext, command: AcceptFlashcardProposalCommand): Promise<AcceptFlashcardProposalResult>`.
   - Implementacja:
     - Pobiera użytkownika (opcjonalnie, jeśli nie zrobimy tego wcześniej w route, ale zaleca się zrobić to w route).
     - Waliduje `category_id`, `generation_id`, `proposal_id` zgodnie z sekcją 5.2.
     - Sprawdza, czy propozycja nie została wcześniej zaakceptowana.
     - Tworzy rekord `flashcards` z `source = 'ai'`.
     - Aktualizuje rekord `generation_proposals`.
     - Zwraca `FlashcardDTO`.
   - Obsługa błędów:
     - Rzuca kontrolowane błędy domenowe (`NotFound`, `Conflict`, `ValidationError`) zamiast bezpośrednio odpowiadać HTTP.

### 9.3. Endpoint Astro

4. **Utwórz endpoint** w `src/pages/api/v1/flashcards/accept.ts`:
   - Eksport `POST` zgodny z typem `APIRoute`.
   - Kroki:
     - Odczyt `locals.supabase`.
     - Pobranie i weryfikacja użytkownika.
     - Bezpieczne odczytanie `request.json()` i walidacja przez Zod.
     - Utworzenie `AcceptFlashcardProposalCommand`.
     - Wywołanie serwisu `acceptFlashcardProposal`.
     - Mapowanie wyniku na `AcceptFlashcardProposalResponseDTO`.
     - Zwrócenie `201 Created` z body.
   - Mapowanie błędów:
     - `ValidationError` → `400`.
     - `Unauthorized` → `401`.
     - `NotFound` → `404`.
     - `Conflict` → `409`.
     - Inne → `500`.

### 9.4. Wdrożenie i monitoring

5. **Skonfiguruj rate limiting** dla `POST /api/v1/flashcards/accept` (np. na poziomie reverse proxy lub edge).
6. **Dodaj logowanie błędów serwerowych**:
   - Logi aplikacyjne dla przypadków `500` (np. `console.error` lub integracja z APM).
   - Unikaj logowania wrażliwych danych (np. pełnych tokenów).
7. **Wdróż zmiany** (CI/CD na GitHub Actions + Docker + DigitalOcean) i wykonaj smoke testy endpointu w środowisku staging/production.

Ten plan zapewnia spójne, bezpieczne i zgodne z projektem wdrożenie endpointu `POST /api/v1/flashcards/accept`, prowadząc zespół od definicji kontraktu HTTP przez walidację, logikę domenową, aż po obsługę błędów i aspekty operacyjne.
