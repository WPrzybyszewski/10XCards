## API Endpoint Implementation Plan: POST /api/v1/flashcards/generate

### 1. Przegląd punktu końcowego

Endpoint `POST /api/v1/flashcards/generate` generuje trzy propozycje fiszek na podstawie dłuższego tekstu użytkownika z wykorzystaniem AI (Openrouter).  
Na sukcesie:

- tworzy jeden rekord w `public.generations`,
- tworzy trzy rekordy w `public.generation_proposals` (indeksy 0–2),
- zwraca `generation_id` i listę propozycji (`id`, `index`, `front`, `back`).

Na błędach generacji lub wewnętrznych problemach:

- loguje zdarzenia w `public.generation_error_logs`,
- zwraca przyjazny komunikat z odpowiednim kodem statusu (`400`, `401`, `502`, `500`).

Endpoint jest uwierzytelniony i przeznaczony dla użytkownika z rolą `authenticated` w Supabase.

### 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/flashcards/generate`
- **Autentykacja**: wymagany ważny token Supabase (`Authorization: Bearer <token>` lub cookies), obsługiwany przez Astro middleware i Supabase.

- **Parametry**:
  - **Wymagane (body JSON)**:
    - `input: string` – długi tekst użytkownika (notatki, artykuł), z którego generujemy fiszki.
  - **Opcjonalne**:
    - brak w MVP.

- **Request Body (Command Model)**:
  - Typ: `GenerateFlashcardsCommand`:
    - `input: string`

- **Walidacja wejścia**:
  - `input` jest wymagany (`400` jeśli brak).
  - `input.trim().length` w zakresie **1000–10000** znaków (włącznie).
    - `< 1000` → `400 Bad Request`.
    - `> 10000` → `400 Bad Request`.
  - Wymagany poprawny JSON (`Content-Type: application/json`).

- **Technicznie (Zod)**:
  - Schema: `z.object({ input: z.string().trim().min(1000).max(10000) })`.

### 3. Wykorzystywane typy

- **Encje (wiążą DTO z DB)**:

  - `GenerationEntity` → `public.generations`  
    Kolumny: `id`, `user_id`, `input`, `created_at`.
  - `GenerationProposalEntity` → `public.generation_proposals`  
    Kolumny: `id`, `generation_id`, `index`, `front`, `back`, `flashcard_id`, `accepted_at`, `created_at`.
  - `GenerationErrorLogEntity` → `public.generation_error_logs`  
    Kolumny: `id`, `user_id`, `generation_id`, `error_code`, `error_message`, `created_at`.

- **Aliasy ID**:
  - `GenerationId` – typ `generations.id`.
  - `GenerationProposalId` – typ `generation_proposals.id`.

- **DTO / Command Models**:

  - Request:
    - `GenerateFlashcardsCommand`:
      - `input: string`
  - Response:
    - `GenerationProposalDTO`:
      - `id: string`
      - `index: number`
      - `front: string`
      - `back: string`
    - `GenerateFlashcardsResponseDTO`:
      - `generation_id: GenerationId`
      - `proposals: GenerationProposalDTO[]`

DTO powstają z encji poprzez `Pick` / `Omit`, dzięki czemu są spójne z typami z `database.types.ts`.

### 4. Szczegóły odpowiedzi

- **Sukces**:
  - `200 OK`
  - Body (`GenerateFlashcardsResponseDTO`):

    ```json
    {
      "generation_id": "uuid",
      "proposals": [
        { "id": "uuid", "index": 0, "front": "Question 1", "back": "Answer 1" },
        { "id": "uuid", "index": 1, "front": "Question 2", "back": "Answer 2" },
        { "id": "uuid", "index": 2, "front": "Question 3", "back": "Answer 3" }
      ]
    }
    ```

- **Błędy**:
  - `400 Bad Request` – brak / niepoprawny / za krótki / za długi `input`.
  - `401 Unauthorized` – brak ważnej sesji Supabase.
  - `502 Bad Gateway` – błąd dostawcy AI (timeout, błąd HTTP, nieprawidłowa odpowiedź).
  - `500 Internal Server Error` – nieprzewidziane błędy po stronie serwera.

`404` nie jest typowe dla tego endpointu (nie szukamy konkretnego zasobu).

### 5. Przepływ danych

1. **Klient → Backend**:
   - React/Astro wywołuje `POST /api/v1/flashcards/generate` z JSON-em `{ "input": "..." }`.
   - Żądanie przechodzi przez middleware (`src/middleware/index.ts`), który ustawia `context.locals.supabase`.

2. **Handler API (Astro)**:
   - Plik: `src/pages/api/v1/flashcards/generate.ts`.
   - Kroki:
     1. Odczyt `const supabase = context.locals.supabase;`.
     2. Sprawdzenie użytkownika: `supabase.auth.getUser()` → brak użytkownika = `401`.
     3. Odczyt body: `const body = await request.json();`.
     4. Walidacja przez Zod do `GenerateFlashcardsCommand`.
     5. Wywołanie serwisu:  
        `const result = await flashcardGeneratorService.generateFlashcardsFromInput({ supabase, userId: user.id, input });`
     6. Zwrócenie `200 OK` z `result`.

3. **Serwis biznesowy** (`flashcardGeneratorService`):
   - Plik: `src/lib/services/flashcardGeneratorService.ts`.
   - Funkcja:

     ```ts
     async function generateFlashcardsFromInput({
       supabase,
       userId,
       input,
     }): Promise<GenerateFlashcardsResponseDTO> { ... }
     ```

   - Odpowiedzialność:
     - Wywołanie `openrouterClient` z przygotowanym promptem.
     - Parsowanie odpowiedzi modelu na 3 propozycje.
     - Walidacja:
       - dokładnie 3 propozycje,
       - `index` ∈ {0, 1, 2},
       - `front.trim().length` 1–200,
       - `back.trim().length` 1–500.
     - Zapis do DB:
       - insert do `generations` z `user_id` i `input`,
       - insert 3 rekordów do `generation_proposals`.
     - Mapping encji do `GenerationProposalDTO` i złożenie `GenerateFlashcardsResponseDTO`.

4. **Integracja z AI** (`openrouterClient`):
   - Plik: `src/lib/services/ai/openrouterClient.ts`.
   - Funkcja: `callOpenrouterForFlashcards(input: string): Promise<RawAiResponse>`.
   - Działanie:
     - `fetch` do Openrouter z `import.meta.env.OPENROUTER_API_KEY`.
     - Ustawienie timeoutu.
     - Parsowanie odpowiedzi na format wewnętrzny (np. JSON z listą `{ front, back }`).

5. **Warstwa DB (Supabase)**:
   - `supabase.from('generations').insert(...)` → zwrot `id`.
   - `supabase.from('generation_proposals').insert([...3 rekordy...])`.
   - RLS wymusza `user_id = auth.uid()`; handler nie przyjmuje `user_id` z klienta.

6. **Logowanie błędów**:
   - Helper `logGenerationError({ supabase, userId, generationId?, errorCode, errorMessage })`:
     - insert do `generation_error_logs`.
   - Wywoływany przy błędach AI / DB z serwisu, zanim błąd trafi do handlera.

### 6. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - Supabase Auth; brak użytkownika = `401`.
- **Autoryzacja / RLS**:
  - RLS na `generations`, `generation_proposals`, `generation_error_logs` → `user_id = auth.uid()`.
  - Brak przyjmowania `user_id` z requestu.
- **Walidacja danych**:
  - Zod–based walidacja `input` (min/max).
  - Walidacja outputu AI (3 propozycje, długości, indeksy).
- **Rate limiting**:
  - Zalecany limit na `POST /api/v1/flashcards/generate` w warstwie infrastruktury.
- **Sekrety**:
  - `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY` tylko po stronie serwera (`import.meta.env`).

### 7. Obsługa błędów

- **Walidacja (wejście)**:
  - Błąd Zod → `400 Bad Request`, body np. `{ "error": "Invalid input", "details": [...] }`.
- **Brak autentykacji**:
  - Brak użytkownika → `401 Unauthorized`, `{ "error": "Unauthorized" }`.
- **Błędy AI**:
  - Timeout / HTTP error / parse error:
    - wpis w `generation_error_logs` (`user_id`, opcjonalnie `generation_id`, `error_code`, `error_message`),
    - odpowiedź `502 Bad Gateway` (lub `500` w prostszej wersji),
    - `{ "error": "AI generation failed, please try again later." }`.
- **Błędy DB**:
  - Problemy z `insert` → log, opcjonalny wpis w `generation_error_logs` z `error_code = "DB_ERROR"`, odpowiedź `500`.
- **Nieoczekiwane wyjątki**:
  - Globalny `try/catch` w handlerze, logging stack trace, odpowiedź `500`.

### 8. Wydajność

- **Koszt AI**:
  - Ograniczenie długości `input` (1000–10000).
  - Timeout na wywołanie Openrouter.
  - Możliwość późniejszego wprowadzenia asynchronicznej generacji (kolejka).
- **Baza danych**:
  - 1 insert do `generations` + 3 inserty do `generation_proposals` → mały narzut.
  - Można łączyć w minimalną liczbę zapytań.
- **Rozmiar odpowiedzi**:
  - Tylko `generation_id` + 3 propozycje (`id`, `index`, `front`, `back`).
- **Skalowalność**:
  - Logika stateless wokół DB i AI → łatwa skalowalność pozioma.

### 9. Kroki implementacji

1. Zweryfikuj / uzupełnij typy w `src/types.ts` (`GenerateFlashcardsCommand`, `GenerationProposalDTO`, `GenerateFlashcardsResponseDTO`).
2. Dodaj schemat Zod dla `GenerateFlashcardsCommand` (`src/lib/validation/flashcards.ts`).
3. Zaimplementuj `openrouterClient` w `src/lib/services/ai/openrouterClient.ts` (wywołanie, timeout, parsowanie).
4. Zaimplementuj `flashcardGeneratorService` w `src/lib/services/flashcardGeneratorService.ts`:
   - integracja z AI,
   - walidacja propozycji,
   - zapisy do DB,
   - mapping do DTO,
   - `logGenerationError`.
5. Dodaj handler `src/pages/api/v1/flashcards/generate.ts`:
   - autentykacja (`auth.getUser()`),
   - walidacja body (Zod),
   - wywołanie serwisu,
   - mapowanie wyjątków na kody HTTP.
6. Skonfiguruj `.env` z `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`.
7. Dodaj testy jednostkowe / integracyjne dla serwisu i endpointu.
8. Skonfiguruj logowanie i monitorowanie (`generation_error_logs`, logi serwera).
9. Włącz / skonfiguruj rate limiting na endpoint w infrastrukturze.


