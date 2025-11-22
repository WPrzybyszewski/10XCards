## API Endpoint Implementation Plan: DELETE /api/v1/flashcards/:id

### 1. Przegląd punktu końcowego

Endpoint służy do **trwałego usuwania pojedynczej fiszki** należącej do zalogowanego użytkownika.  
Usuwa wiersz z tabeli `public.flashcards`, respektując RLS (użytkownik może usuwać tylko własne fiszki).  
Operacja nie przyjmuje body i w przypadku sukcesu zwraca `204 No Content`.

---

### 2. Szczegóły żądania

- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/v1/flashcards/:id`
  - `:id` – segment ścieżki zawierający UUID fiszki do usunięcia.

- **Parametry**:
  - **Wymagane (path params)**:
    - `id: string (UUID)` – identyfikator fiszki.
  - **Opcjonalne**: brak.

- **Request body**:
  - Brak (`DELETE` bez JSON body).

- **Nagłówki**:
  - `Authorization: Bearer <supabase-access-token>` – wymagany (sesja rozwiązywana w middleware).

---

### 3. Wykorzystywane typy

Choć endpoint nie zwraca JSON body na sukces, korzysta z istniejących typów domenowych i DTO:

- **Encje/DTO (z `src/types.ts`)**:
  - `FlashcardEntity` – pełna encja tabeli `flashcards` (zawiera m.in. `id`, `user_id`, `category_id`, `front`, `back`, `source`, `created_at`, `updated_at`).
  - `FlashcardDTO = Omit<FlashcardEntity, 'user_id'>;` – publiczna reprezentacja fiszki (istotna przy przyszłym GET /:id).

- **Supabase**:
  - `SupabaseClient` z `src/db/supabase.client.ts` (alias typowy dla całego projektu).

- **Nowe typy walidacji (w `src/lib/validation/flashcards.ts`)**:
  - `deleteFlashcardParamsSchema` – Zod schema walidująca parametry ścieżki:
    - `{ id: z.string().uuid() }`.
  - `DeleteFlashcardParamsInput = z.infer<typeof deleteFlashcardParamsSchema>;` (opcjonalny alias).

- **Serwis domenowy (do dodania w `src/lib/services/flashcardService.ts`)**:
  - `deleteFlashcard(params: { supabase: SupabaseClient; userId: string; id: string; }): Promise<boolean>`
    - Zwraca `true` jeśli fiszka została usunięta,
    - Zwraca `false` jeśli nie znaleziono fiszki należącej do użytkownika.

---

### 4. Szczegóły odpowiedzi

#### 4.1. Sukces

- **Status**: `204 No Content`
- **Body**: brak (pusta odpowiedź).

Warunek sukcesu:
- Fiszka o danym `id` istnieje i należy do użytkownika (RLS + `user_id` = `auth.uid()` zapewnia to na poziomie DB),
- Operacja `DELETE` w Supabase usunęła dokładnie jeden wiersz.

#### 4.2. Błędy

- `401 Unauthorized`
  - brak ważnej sesji:
    - `locals.session` jest `null` lub brak `locals.session.user.id`.

- `404 Not Found`
  - fiszka nie istnieje, albo istnieje, ale nie należy do użytkownika (RLS powoduje, że DELETE nie usunie żadnego wiersza).

- `500 Internal Server Error`
  - nieoczekiwane błędy po stronie serwera (Supabase/połączenie, inne wyjątki runtime).

Odpowiedzi błędów powinny korzystać z istniejącego helpera `createErrorResponse`:
- Spójna struktura (`status`, `code`, `message`, opcjonalne `details`).

---

### 5. Przepływ danych

#### 5.1. Wejście → Middleware → Endpoint

1. Klient wysyła:
   - `DELETE /api/v1/flashcards/<id>` (np. `/api/v1/flashcards/3f2b4c8e-...`)  
   - z nagłówkiem `Authorization: Bearer <token>`.
2. **Middleware (`src/middleware/index.ts`)**:
   - Tworzy `supabase` server client (`createSupabaseServerClient`),
   - Pobiera sesję (`supabase.auth.getSession()`),
   - Ustawia:
     - `context.locals.supabase`,
     - `context.locals.session`.

3. Żądanie trafia do nowego pliku endpointu:
   - `src/pages/api/v1/flashcards/[id].ts` (suggested pattern dla pojedynczych zasobów).

#### 5.2. Logika handlera DELETE

W `src/pages/api/v1/flashcards/[id].ts`:

1. **Wyciągnięcie kontekstu**:
   - `const { locals, params } = context;`
   - `const supabase = locals.supabase;`
   - `const session = locals.session;`

2. **Guard: autoryzacja**:
   - Jeśli `!session?.user?.id` → zwróć `401 Unauthorized`:
     - `createErrorResponse(401, "Unauthorized", "You must be signed in to delete flashcards.");`

3. **Guard: dostępność Supabase**:
   - Jeśli `!supabase` → `500 Internal Server Error` z komunikatem `"Supabase client not available."`.

4. **Walidacja parametru `id`**:
   - Z `params.id` zbuduj obiekt `{ id: params.id ?? "" }`.
   - Przepuść go przez `deleteFlashcardParamsSchema.safeParse`.
   - W razie niepowodzenia:
     - `400 Bad Request` z informacją, że `id` jest nieprawidłowym UUID (spójne z innymi endpointami – `field: "id"`, `issues` = lista błędów).

5. **Wywołanie serwisu domenowego**:
   - `const deleted = await deleteFlashcard({ supabase, userId: session.user.id, id });`
   - **Implementacja w serwisie**:
     - Wywołaj:
       ```ts
       const { data, error } = await supabase
         .from("flashcards")
         .delete()
         .eq("id", id)
         .select("id")
         .maybeSingle();
       ```
     - Jeżeli `error`:
       - jeśli to typ „no rows” (w przypadku użycia `.single()`), zmapuj na brak danych,
       - inne błędy rzuć jako `Error("Failed to delete flashcard: ...")`.
     - Jeżeli `data == null` → zwróć `false`.
     - Jeżeli `data` istnieje → zwróć `true`.
     - Dzięki RLS:
       - jeśli fiszka nie należy do użytkownika → DELETE nie usunie żadnego wiersza → `data == null` → 404.

6. **Zwrócenie odpowiedzi**:
   - Jeśli `deleted === false` → `404 Not Found`:
     - `createErrorResponse(404, "Not Found", "Flashcard not found.");`
   - Jeśli `deleted === true` → `new Response(null, { status: 204 });`

7. **Obsługa wyjątków**:
   - Otocz logikę `try/catch`.
   - W `catch (error)`:
     - `console.error("Unexpected error in DELETE /api/v1/flashcards/:id", error);`
     - `createErrorResponse(500, "Internal Server Error", "Something went wrong. Please try again later.");`

#### 5.3. RLS i relacje

- Tabela `public.flashcards` ma RLS:
  - Polityki `flashcards_delete_own` gwarantują, że:
    - tylko wiersze z `user_id = auth.uid()` mogą być usuwane przez `authenticated`.
- Dzięki temu nie musimy ręcznie sprawdzać `user_id` fiszki:
  - brak uprawnień → DELETE nie usunie wiersza → traktujemy jako `404 Not Found`.

---

### 6. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - Endpoint wymaga ważnego access tokena Supabase.
  - Anonimowe żądania są odrzucane (`401`).

- **Autoryzacja**:
  - Użytkownik może usunąć tylko swoje fiszki:
    - RLS na `public.flashcards` wymusza `user_id = auth.uid()`.
    - Jeśli fiszka istnieje, ale należy do innego użytkownika, Supabase „udaje”, że jej nie ma (0 usuniętych wierszy), co mapujemy na `404`.

- **Brak body**:
  - `DELETE` nie przyjmuje JSON body; ogranicza to powierzchnię ataku (brak manipulacji dodatkowymi polami).

- **Brak logów danych wrażliwych**:
  - W ewentualnych `console.error` nie logujemy pełnych treści fiszek (front/back); jedynie id fiszki / kody błędów.

- **Ochrona przed przypadkowym mass-delete**:
  - Zawsze filtrujemy po `id`:
    - `.eq("id", id)` – brak możliwości usunięcia więcej niż 1 rekordu.

---

### 7. Obsługa błędów

#### 7.1. Scenariusze błędów i statusy

- **Brak sesji / nieautoryzowany dostęp**:
  - Warunek: `!locals.session?.user?.id`.
  - Odpowiedź: `401 Unauthorized`, komunikat `"You must be signed in to delete flashcards."`.

- **Nieprawidłowe `id` (UUID)**:
  - Warunek: walidacja `deleteFlashcardParamsSchema` zwraca błąd.
  - Odpowiedź: `400 Bad Request`, z `field: "id"`, opisem problemu (np. „Invalid UUID format”).

- **Fiszka nie istnieje lub nie należy do użytkownika**:
  - Warunek: `deleteFlashcard` zwróci `false` (`data == null` po DELETE).
  - Odpowiedź: `404 Not Found`, komunikat `"Flashcard not found."`.

- **Błąd DB / infrastrukturalny**:
  - Warunek: Supabase zwróci `error` przy DELETE (poza scenariuszem „no rows”).
  - Działanie:
    - zalogować: `console.error("Failed to delete flashcard", error);`
    - Odpowiedź: `500 Internal Server Error`, generyczna wiadomość.

#### 7.2. Logowanie

- Nie ma osobnej tabeli logów dla operacji CRUD fiszek – wystarczy logowanie do stdout:
  - pozwala DigitalOcean / hostingowi zebrać logi i przeglądać je w panelu.
- Prefiksy w logach:
  - `"[flashcards] ..."`, `"[DELETE /api/v1/flashcards/:id] ..."` ułatwiają późniejszy filtr.

---

### 8. Rozważania dotyczące wydajności

- Operacja jest **bardzo lekka**:
  - pojedyncze `DELETE` po indeksowanym polu `id` (PK),
  - żadnej dodatkowej logiki agregującej / pętli.
- Istniejący indeks na `flashcards.id` (PK) zapewnia O(1) dostęp.
- Dla bardzo dużych wolumenów użytkowników:
  - RLS i indeksy `user_id` + `id` zapewniają liniową skalowalność per użytkownik.
- Endpoint nie wymaga dodatkowych optymalizacji (brak dużych payloadów, brak filtrów).

---

### 9. Etapy wdrożenia

1. **Walidacja parametrów** – `src/lib/validation/flashcards.ts`
   - [ ] Dodać:
     ```ts
     export const deleteFlashcardParamsSchema = z.object({
       id: z.string().uuid(),
     });
     ```
   - [ ] (Opcjonalnie) wyeksportować `DeleteFlashcardParamsInput`.

2. **Serwis domenowy** – `src/lib/services/flashcardService.ts`
   - [ ] Dodać:
     ```ts
     export interface DeleteFlashcardParams {
       supabase: SupabaseClient;
       userId: string;
       id: string;
     }

     export async function deleteFlashcard(
       params: DeleteFlashcardParams,
     ): Promise<boolean> {
       const { supabase, id } = params;
       const { data, error } = await supabase
         .from("flashcards")
         .delete()
         .eq("id", id)
         .select("id")
         .maybeSingle();

       if (error) {
         throw new Error(`Failed to delete flashcard: ${error.message}`);
       }

       return data != null;
     }
     ```
   - [ ] Upewnić się, że serwis nie loguje sam wrażliwych danych – logowanie zostawić endpointowi.

3. **Plik endpointu** – `src/pages/api/v1/flashcards/[id].ts`
   - [ ] Utworzyć plik (jeśli nie istnieje).
   - [ ] Zaimplementować:
     ```ts
     import type { APIContext } from "astro";
     import { createErrorResponse } from "@/lib/http";
     import { deleteFlashcardParamsSchema } from "@/lib/validation/flashcards";
     import { deleteFlashcard } from "@/lib/services/flashcardService";

     export async function DELETE(context: APIContext): Promise<Response> {
       const { locals, params } = context;
       const supabase = locals.supabase;
       const session = locals.session;

       if (!session?.user?.id) {
         return createErrorResponse(
           401,
           "Unauthorized",
           "You must be signed in to delete flashcards.",
         );
       }

       if (!supabase) {
         return createErrorResponse(
           500,
           "Internal Server Error",
           "Supabase client not available.",
         );
       }

       const parseResult = deleteFlashcardParamsSchema.safeParse({
         id: params.id ?? "",
       });

       if (!parseResult.success) {
         const firstIssue = parseResult.error.issues[0];
         return createErrorResponse(400, "Bad Request", firstIssue.message, {
           field: firstIssue.path.join("."),
           issues: parseResult.error.issues,
         });
       }

       const { id } = parseResult.data;

       try {
         const deleted = await deleteFlashcard({
           supabase,
           userId: session.user.id,
           id,
         });

         if (!deleted) {
           return createErrorResponse(
             404,
             "Not Found",
             "Flashcard not found.",
           );
         }

         return new Response(null, { status: 204 });
       } catch (error) {
         // eslint-disable-next-line no-console
         console.error(
           "Unexpected error in DELETE /api/v1/flashcards/:id",
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
   - [ ] Dostroić importy, formatowanie i wyłączyć ewentualne lintery tam, gdzie to konieczne (np. `no-console`).

4. **Testy jednostkowe (Vitest)**  
   - [ ] Dodać testy dla `deleteFlashcardParamsSchema`:
     - prawidłowy UUID,
     - nieprawidłowe stringi → błąd.
   - [ ] Dodać testy dla serwisu `deleteFlashcard`:
     - scenariusz usunięcia (mock Supabase zwraca `data: { id }`),
     - scenariusz `not found` (`data: null`),
     - scenariusz błędu DB (`error` ustawione).

5. **Testy endpointu (integracyjne / E2E)**  
   - [ ] Test integracyjny z uruchomionym serwerem Astro:
     - `DELETE` na istniejącą fiszkę → `204`, późniejszy `GET` listy nie zawiera fiszki.
     - `DELETE` na nieistniejącą/nie swoją fiszkę → `404`.
     - `DELETE` bez autentykacji → `401`.

6. **Przegląd i refaktoryzacja**
   - [ ] Sprawdzić spójność odpowiedzi z innymi endpointami (format błędów, kody).
   - [ ] Zweryfikować, że ścieżki importów (`@/lib/...`, `@/db/...`) są poprawne.
   - [ ] Upewnić się, że plik jest objęty ESLint/Prettier i przechodzi `npm run lint` oraz `npm run test:unit` (po dodaniu testów). */


