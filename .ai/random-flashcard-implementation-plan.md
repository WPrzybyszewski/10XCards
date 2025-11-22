## API Endpoint Implementation Plan: GET /api/v1/flashcards/random

### 1. Przegląd punktu końcowego

Endpoint zwraca **losową fiszkę** dla zalogowanego użytkownika, opcjonalnie ograniczoną do konkretnej kategorii (`category_id`).  
Wybór jest wykonywany po stronie backendu, ale **MVP nie śledzi historii** – frontend odpowiada za unikanie powtórek w danej sesji.  
Dane pochodzą z tabeli `public.flashcards` z włączonym RLS, więc użytkownik widzi wyłącznie własne fiszki.

---

### 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Ścieżka**: `/api/v1/flashcards/random`
- **Nagłówki**:
  - `Authorization: Bearer <supabase-access-token>`
- **Parametry**:
  - **Query (opcjonalne)**:
    - `category_id?: string (UUID)` – gdy podane, ogranicza losowanie do fiszek z tej kategorii.
  - **Path params**: brak.
  - **Body**: brak (GET bez body).

---

### 3. Wykorzystywane typy

Z `src/types.ts`:

- **DTO / encje**:
  - `FlashcardDTO = Omit<FlashcardEntity, 'user_id'>;`
    - Pola: `id`, `category_id`, `front`, `back`, `source`, `created_at`, `updated_at`.

- **Supabase**:
  - `SupabaseClient` z `src/db/supabase.client.ts`.

- **Walidacja (`src/lib/validation/flashcards.ts`)**:
  - `randomFlashcardQuerySchema`:
    ```ts
    export const randomFlashcardQuerySchema = z.object({
      category_id: z.string().uuid().optional(),
    });
    ```
  - (opcjonalnie) `RandomFlashcardQueryInput = z.infer<typeof randomFlashcardQuerySchema>;`.

- **Serwis domenowy (`src/lib/services/flashcardService.ts`)**:
  - ```ts
    export interface GetRandomFlashcardParams {
      supabase: SupabaseClient;
      userId: string;
      categoryId?: string;
    }

    export async function getRandomFlashcard(
      params: GetRandomFlashcardParams,
    ): Promise<FlashcardDTO | null> { ... }
    ```

---

### 4. Szczegóły odpowiedzi

- **Sukces** – `200 OK`:

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

(`source` może być `"ai"` lub `"manual"` w zależności od pochodzenia rekordu.)

- **Brak fiszek** – `404 Not Found`:
  - użytkownik nie ma żadnych fiszek (lub w podanej kategorii nie ma żadnych rekordów).

- **Błędy**:
  - `400 Bad Request` – np. niepoprawny format `category_id` (nie-UUID).
  - `401 Unauthorized` – brak lub nieważna sesja.
  - `500 Internal Server Error` – niespodziewany błąd serwera / Supabase.

Odpowiedzi błędów korzystają z helpera `createErrorResponse`.

---

### 5. Przepływ danych

1. Klient wywołuje `GET /api/v1/flashcards/random[?category_id=...]` z nagłówkiem `Authorization`.
2. **Middleware (`src/middleware/index.ts`)**:
   - tworzy Supabase server client (`createSupabaseServerClient`),
   - pobiera sesję (`supabase.auth.getSession()`),
   - ustawia:
     - `locals.supabase`,
     - `locals.session`.
3. **Endpoint `src/pages/api/v1/flashcards/random.ts`**:
   - `GET(context: APIContext)`:
     - sprawdza `locals.session?.user?.id`; brak → `401`,
     - sprawdza `locals.supabase`; brak → `500`,
     - pobiera `category_id` z `context.url.searchParams`,
     - waliduje przez `randomFlashcardQuerySchema.safeParse({ category_id })`; błędy → `400` z listą issues.
4. **Serwis `getRandomFlashcard`**:
   - Buduje zapytanie Supabase do `flashcards`:
     ```ts
     const base = supabase
       .from("flashcards")
       .select("id, category_id, front, back, source, created_at, updated_at");

     const query = categoryId ? base.eq("category_id", categoryId) : base;

     const { data, error } = await query.limit(MAX_RANDOM_CANDIDATES);
     ```
     - RLS wymusza, że zwrócone rekordy należą do bieżącego użytkownika.
   - Jeśli `error` → rzuca `Error("Failed to load random flashcards: ...")`.
   - Jeśli `!data || data.length === 0` → zwraca `null`.
   - Wybiera losowy element:
     ```ts
     const index = Math.floor(Math.random() * data.length);
     return data[index] as FlashcardDTO;
     ```
5. **Endpoint**:
   - `flashcard === null` → `404 Not Found` z komunikatem `"No flashcards found for this user (and category)."`.
   - W przeciwnym razie → `createJsonResponse(200, flashcard)`.

---

### 6. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - wymagana aktywna sesja Supabase; brak → `401`.
- **Autoryzacja / RLS**:
  - Tabela `public.flashcards` ma włączony RLS (`flashcards_select_own`), więc użytkownik widzi wyłącznie swoje fiszki.
  - `category_id` w query nie wymaga osobnego sprawdzenia własności – SELECT na `flashcards` i tak zwróci wyłącznie wiersze użytkownika.
- **Brak modyfikacji danych**:
  - endpoint jest tylko do odczytu; nie modyfikuje `flashcards`.
- **Logowanie**:
  - logować wyłącznie błędy techniczne (`console.error("Unexpected error in GET /api/v1/flashcards/random", error)`),
  - nie wypisywać w logach treści fiszek (`front/back`).

---

### 7. Obsługa błędów

- `400 Bad Request`:
  - walidacja Zod dla `category_id` nie przeszła (zły UUID),
  - odpowiedź zawiera `field` (np. `"category_id"`) i `issues`.
- `401 Unauthorized`:
  - `locals.session?.user?.id` jest puste.
- `404 Not Found`:
  - `getRandomFlashcard` zwróci `null` (brak fiszek dla użytkownika / w danej kategorii).
- `500 Internal Server Error`:
  - `error` z Supabase przy SELECT,
  - inne wyjątki przy przetwarzaniu.

Wszystkie błędy formatujemy helperem `createErrorResponse` z odpowiednim kodem statusu i czytelnym komunikatem.

---

### 8. Wydajność

- **MVP**:
  - prosty SELECT z limitem (np. 100 rekordów), losowanie w pamięci:
    - złożoność O(1) względem całej bazy (limit),
    - minimalne obciążenie CPU po stronie Node.
- **Skalowanie**:
  - dla bardzo dużej liczby fiszek można w przyszłości:
    - wprowadzić funkcję SQL `get_random_flashcard(user_id uuid, category_id uuid default null)` i wywoływać ją przez `supabase.rpc`,
    - ewentualnie użyć SQL `ORDER BY random() LIMIT 1` po stronie DB.
- Indeksy:
  - istniejące indeksy po `user_id`/`category_id` wspierają filtrację; RLS wykorzystuje `user_id` przy selekcji.

---

### 9. Kroki implementacji

1. **Walidacja (`src/lib/validation/flashcards.ts`)**
   - Dodać:
     ```ts
     export const randomFlashcardQuerySchema = z.object({
       category_id: z.string().uuid().optional(),
     });
     ```
   - (Opcjonalnie) `export type RandomFlashcardQueryInput = z.infer<typeof randomFlashcardQuerySchema>;`.

2. **Serwis (`src/lib/services/flashcardService.ts`)**
   - Dodać typ:
     ```ts
     export interface GetRandomFlashcardParams {
       supabase: SupabaseClient;
       userId: string;
       categoryId?: string;
     }
     ```
   - Zaimplementować:
     ```ts
     const MAX_RANDOM_CANDIDATES = 100;

     export async function getRandomFlashcard(
       params: GetRandomFlashcardParams,
     ): Promise<FlashcardDTO | null> {
       const { supabase, categoryId } = params;

       const base = supabase
         .from("flashcards")
         .select("id, category_id, front, back, source, created_at, updated_at");

       const query = categoryId ? base.eq("category_id", categoryId) : base;

       const { data, error } = await query.limit(MAX_RANDOM_CANDIDATES);

       if (error) {
         throw new Error(`Failed to load random flashcards: ${error.message}`);
       }

       if (!data || data.length === 0) {
         return null;
       }

       const index = Math.floor(Math.random() * data.length);
       return data[index] as FlashcardDTO;
     }
     ```

3. **Endpoint (`src/pages/api/v1/flashcards/random.ts`)**
   - Utworzyć plik i zaimplementować:
     ```ts
     import type { APIContext } from "astro";
     import { createErrorResponse, createJsonResponse } from "@/lib/http";
     import { randomFlashcardQuerySchema } from "@/lib/validation/flashcards";
     import { getRandomFlashcard } from "@/lib/services/flashcardService";

     export async function GET(context: APIContext): Promise<Response> {
       const { locals, url } = context;
       const supabase = locals.supabase;
       const session = locals.session;

       if (!session?.user?.id) {
         return createErrorResponse(
           401,
           "Unauthorized",
           "You must be signed in to get a random flashcard.",
         );
       }

       if (!supabase) {
         return createErrorResponse(
           500,
           "Internal Server Error",
           "Supabase client not available.",
         );
       }

       const parseResult = randomFlashcardQuerySchema.safeParse({
         category_id: url.searchParams.get("category_id") ?? undefined,
       });

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

       const { category_id } = parseResult.data;

       try {
         const flashcard = await getRandomFlashcard({
           supabase,
           userId: session.user.id,
           categoryId: category_id,
         });

         if (!flashcard) {
           return createErrorResponse(
             404,
             "Not Found",
             "No flashcards found for this user (and category).",
           );
         }

         return createJsonResponse(200, flashcard);
       } catch (error) {
         // eslint-disable-next-line no-console
         console.error("Unexpected error in GET /api/v1/flashcards/random", error);
         return createErrorResponse(
           500,
           "Internal Server Error",
           "Something went wrong. Please try again later.",
         );
       }
     }
     ```

4. **Testy jednostkowe (Vitest)**
   - Testy `randomFlashcardQuerySchema`:
     - brak `category_id` → sukces,
     - poprawny UUID → sukces,
     - nie-UUID → `400`.
   - Testy `getRandomFlashcard` z mockowanym Supabase:
     - `data` z kilkoma fiszkami → zwraca jedną,
     - `data` puste → `null`,
     - `error` ustawione → rzuca `Error`.

5. **Testy integracyjne / E2E**
   - `GET` z ważną sesją i istniejącymi fiszkami → `200` i poprawny JSON.
   - `GET` dla użytkownika bez fiszek → `404`.
   - `GET` z `category_id`, w której nie ma fiszek → `404`.
   - `GET` bez sesji → `401`.

6. **Lint / review**
   - Sprawdzić `npm run lint` i `npm run test:unit`.
   - Zweryfikować spójność stylu i formatów odpowiedzi z innymi endpointami (`/api/v1/flashcards`).


