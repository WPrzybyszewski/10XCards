## API Endpoint Implementation Plan: POST /api/v1/categories

### 1. Przegląd punktu końcowego

Endpoint `POST /api/v1/categories` służy do **utworzenia nowej kategorii** dla zalogowanego użytkownika.  
Przyjmuje prosty JSON z nazwą kategorii (`name`), waliduje ją (niepusty string, długość 1–100, unikalność w ramach użytkownika) i zapisuje nowy rekord w `public.categories`.  
W odpowiedzi zwraca utworzoną kategorię (bez `user_id`) wraz z znacznikami czasu.

---

### 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **Ścieżka**: `/api/v1/categories`
- **Autentykacja**: wymagana (Supabase, rola `authenticated`), obsługiwane przez middleware (`context.locals.supabase`).

#### 2.1. Parametry

- **Body (JSON)** – wymagane:

  ```json
  {
    "name": "Biology"
  }
  ```

- **Brak parametrów path/query** dla tego endpointu.

#### 2.2. Walidacja danych wejściowych

Reguły ze specyfikacji:

- `name`:
  - wymagane,
  - po `trim()` nie może być puste,
  - długość po `trim()` w zakresie `1–100` znaków (limit UI).
- Unikalność:
  - nazwa musi być unikalna per użytkownik (`unique (user_id, name)` w DB),
  - duplikaty zwracają `409 Conflict`.

Technicznie:

- używamy **Zod** do walidacji body w handlerze:

  ```ts
  const createCategoryCommandSchema = z.object({
    name: z.string().trim().min(1).max(100),
  });
  ```

- W przypadku błędu walidacji (brak `name`, pusty po trim, zbyt długi) handler zwraca:
  - `400 Bad Request`,
  - JSON z prostym komunikatem błędu.

---

### 3. Wykorzystywane typy

- **Encje (DB)** – z `src/db/database.types.ts` via `src/types.ts`:
  - `CategoryEntity` → tabela `public.categories`:
    - `id: uuid`,
    - `user_id: uuid`,
    - `name: string`,
    - `created_at: timestamptz`,
    - `updated_at: timestamptz`.

- **DTO / Command Models** – z `src/types.ts`:
  - `CategoryDTO = Omit<CategoryEntity, 'user_id'>;`
  - `CreateCategoryCommand`:

    ```ts
    export interface CreateCategoryCommand {
      name: CategoryEntity['name'];
    }
    ```

  - `CreateCategoryResponseDTO = CategoryDTO;`

DTO są cienką warstwą nad encją, co utrzymuje spójność typów pomiędzy API i bazą danych.

---

### 4. Szczegóły odpowiedzi

- **Sukces**:
  - Kod: `201 Created`
  - Body (`CreateCategoryResponseDTO` / `CategoryDTO`):

    ```json
    {
      "id": "uuid",
      "name": "Biology",
      "created_at": "2025-11-15T10:00:00.000Z",
      "updated_at": "2025-11-15T10:00:00.000Z"
    }
    ```

- **Błędy**:
  - `400 Bad Request` – brak/niepoprawne `name` (np. pusty po trim, za długi).
  - `401 Unauthorized` – brak ważnej sesji użytkownika.
  - `409 Conflict` – kategoria o tej nazwie już istnieje dla danego użytkownika.
  - `500 Internal Server Error` – nieprzewidziany błąd po stronie serwera (DB, logika).

---

### 5. Przepływ danych

1. **Klient → Backend**
   - Frontend (React/Astro) wysyła `POST /api/v1/categories` z JSON-em `{ "name": "Biology" }`.
   - Dołącza token Supabase (nagłówek lub cookie).

2. **Middleware Astro**
   - `src/middleware/index.ts` tworzy `context.locals.supabase` przy użyciu `supabaseClient`.
   - Supabase klient ma kontekst użytkownika (na podstawie tokenu).

3. **Handler API (Astro)**
   - Docelowy plik: `src/pages/api/v1/categories/index.ts` (obsługa `POST`).
   - Kroki:
     1. Odczytaj `const supabase = context.locals.supabase;`.
     2. Sprawdź autentykację:
        - `const { data: { user }, error } = await supabase.auth.getUser();`
        - brak użytkownika → `401 Unauthorized`.
     3. Odczytaj body:
        - `const body = await request.json();`
     4. Zweryfikuj przez Zod (`createCategoryCommandSchema`) → `CreateCategoryCommand`:
        - błąd walidacji → `400 Bad Request`.
     5. Wywołaj serwis domenowy:

        ```ts
        const category = await categoryService.createCategory({
          supabase,
          userId: user.id,
          command,
        });
        ```

     6. Zmapuj wynik (`CategoryEntity`) na `CreateCategoryResponseDTO` (`CategoryDTO`).
     7. Zwróć `201 Created` z JSON-em kategorii.

4. **Serwis domenowy (categoryService)**
   - Nowy (lub rozszerzony) plik: `src/lib/services/categoryService.ts`.
   - Funkcja:

     ```ts
     async function createCategory({
       supabase,
       userId,
       command,
     }): Promise<CategoryEntity> { ... }
     ```

   - Kroki w serwisie:
     1. Przygotuj `trimmedName = command.name.trim();` (sama walidacja wykonana już przez Zod).
     2. (Opcjonalnie) sprawdź, czy kategoria o tej nazwie nie istnieje:
        - `select...eq('user_id', userId).eq('name', trimmedName)`:
          - jeśli istnieje → rzuć błąd domenowy `CategoryAlreadyExistsError` (handler zamieni go na `409`).
     3. Wstaw nowy rekord do `categories`:

        - użyj `supabase.from('categories').insert({ user_id: userId, name: trimmedName }).select().single();`
        - RLS dopilnuje, by `user_id` był spójny z `auth.uid()` (w razie potrzeby).
     4. Obsłuż błędy unikalności:
        - jeśli DB zwróci constraint violation na `categories_user_id_name_key`, mapuj to na `CategoryAlreadyExistsError` (jeśli nie robisz wcześniejszego `select`).
     5. Zwróć utworzoną `CategoryEntity`.

5. **Warstwa DB (Supabase)**
   - Tabela `public.categories`:
     - `id` – PK (`uuid`, generowany w DB),
     - `user_id` – powiązany z `auth.users.id`,
     - `name` – tekst, z constraintem `length(trim(name)) > 0`,
     - `created_at`, `updated_at` – wypełniane automatycznie.
   - Constraint:
     - `unique (user_id, name)` – zapewnia unikalność kategorii per użytkownik.
   - RLS:
     - ogranicza operacje do wierszy, gdzie `user_id = auth.uid()`.

6. **Backend → Klient**
   - Handler zwraca `201` i JSON utworzonej kategorii.
   - W przypadku błędów – jeden z kodów `400`, `401`, `409`, `500` z krótkim komunikatem.

---

### 6. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - Endpoint dostępny wyłącznie dla zalogowanych użytkowników.
  - Brak / nieważny token → `401 Unauthorized`.

- **Autoryzacja i RLS**:
  - Tabela `categories` posiada RLS:
    - użytkownik może tworzyć i odczytywać tylko własne kategorie (`user_id = auth.uid()`).
  - Backend nigdy nie przyjmuje `user_id` od klienta – używa `user.id` z Supabase.

- **Walidacja danych**:
  - Zod schema zapewnia:
    - brak pustych nazw po `trim()`,
    - długość nazwy ≤ 100,
    - odrzucanie nie-stringowych wartości.
  - Dodatkowo constraint DB `check(length(trim(name)) > 0)` zabezpiecza spójność w bazie.

- **Brak wycieku danych wrażliwych**:
  - DTO nie zawiera `user_id`.
  - Komunikaty błędów są przyjazne, bez szczegółów implementacyjnych (np. specyficznych kodów błędów DB).

---

### 7. Obsługa błędów

- **Błędy walidacji (wejście)**:
  - `name` brak, pusty po `trim`, za długi:
    - Odpowiedź: `400 Bad Request`
    - Body: `{ "error": "Invalid name" }` (ew. z `details` opisującymi walidację).

- **Brak autentykacji**:
  - `401 Unauthorized`
  - Body: `{ "error": "Unauthorized" }`.

- **Duplikat nazwy kategorii**:
  - Jeśli kategoria o danej nazwie już istnieje dla użytkownika:
    - Odpowiedź: `409 Conflict`
    - Body: `{ "error": "Category with this name already exists" }`.
  - Detekcja:
    - albo w serwisie przez wstępne `select`,
    - albo przez przechwycenie błędu constraintu unikalności z DB i zamianę na błąd domenowy.

- **Błędy DB / wewnętrzne**:
  - Problemy z połączeniem, niespodziewane wyjątki:
    - logowanie (stdout / monitoring),
    - `500 Internal Server Error`,
    - Body: `{ "error": "Internal server error" }`.

> Uwaga: logowanie do tabeli `generation_error_logs` nie ma zastosowania dla tego endpointu – wystarczy standardowe logowanie aplikacyjne.

---

### 8. Wydajność

- **Charakter operacji**:
  - Pojedynczy insert do `categories` + ewentualny lekki `select` na sprawdzenie duplikatu.
  - Operacja jest bardzo lekka dla DB.

- **Uniqueness check**:
  - Można polegać wyłącznie na constraintcie `unique (user_id, name)`:
    - pozwala ograniczyć dodatkowe zapytania,
    - wymaga obsługi błędu constraintu na poziomie serwisu.
  - Ewentualne dodatkowe `select` przed insertem dodaje niewielki narzut, ale upraszcza obsługę błędów.

- **Skalowalność**:
  - Logika endpointu jest stateless po stronie aplikacji → łatwa skalowalność pozioma.
  - Ten endpoint nie jest intensywnie wykorzystywany (tworzenie kategorii jest rzadkie), więc nie stanowi wąskiego gardła.

---

### 9. Kroki implementacji

1. **Typy i walidacja**:
   - Potwierdź istniejące typy w `src/types.ts`:
     - `CategoryEntity`, `CategoryDTO`, `CreateCategoryCommand`, `CreateCategoryResponseDTO`.
   - Utwórz schemat Zod w `src/lib/validation/categories.ts` (np. `createCategoryCommandSchema`).

2. **Serwis `categoryService`**:
   - Utwórz / rozbuduj `src/lib/services/categoryService.ts` o funkcję:

     ```ts
     async function createCategory({
       supabase,
       userId,
       command,
     }): Promise<CategoryEntity> { ... }
     ```

   - Zaimplementuj:
     - trimowanie nazw,
     - ewentualny pre-check duplikatów,
     - insert i mapowanie błędów constraintu.

3. **Handler API**:
   - Utwórz `src/pages/api/v1/categories/index.ts`:
     - obsłuż `POST`:
       - auth (`supabase.auth.getUser()`),
       - walidacja body (Zod),
       - wywołanie `categoryService.createCategory`,
       - `201` z `CreateCategoryResponseDTO`,
       - mapowanie błędów (`400/401/409/500`).

4. **Konfiguracja środowiska**:
   - Endpoint wykorzystuje istniejące zmienne Supabase (`SUPABASE_URL`, `SUPABASE_KEY`); brak dodatkowych konfiguracji.

5. **Logowanie i monitoring**:
   - Upewnij się, że nieoczekiwane błędy są logowane do standardowego systemu logowania (stdout, monitoring).


