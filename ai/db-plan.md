# Schemat bazy danych PostgreSQL dla aplikacji Fiszki (MVP)

## 1. Typy niestandardowe

### `flashcard_source`

Typ wyliczeniowy do określania źródła pochodzenia fiszki.

```sql
CREATE TYPE public.flashcard_source AS ENUM ('manual', 'ai');
```

### `generation_status`

Typ wyliczeniowy określający status procesu generowania fiszek przez AI.

```sql
CREATE TYPE public.generation_status AS ENUM ('pending', 'processing', 'completed', 'failed');
```

## 2. Tabele

### `public.categories`

Przechowuje kategorie tworzone przez użytkowników.

```sql
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Komentarze do tabeli i kolumn
COMMENT ON TABLE public.categories IS 'Stores user-defined categories for flashcards.';
COMMENT ON COLUMN public.categories.id IS 'Primary key for the category.';
COMMENT ON COLUMN public.categories.user_id IS 'Foreign key referencing the user who owns the category.';
COMMENT ON COLUMN public.categories.name IS 'Name of the category (max 100 characters).';
COMMENT ON COLUMN public.categories.created_at IS 'Timestamp of when the category was created.';
COMMENT ON COLUMN public.categories.updated_at IS 'Timestamp of when the category was last updated.';
```

### `public.flashcards`

Przechowuje fiszki (pytanie-odpowiedź) tworzone przez użytkowników.

```sql
CREATE TABLE public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    generation_id UUID REFERENCES public.generations(id) ON DELETE SET NULL,
    question VARCHAR(200) NOT NULL,
    answer VARCHAR(500) NOT NULL,
    source public.flashcard_source NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Komentarze do tabeli i kolumn
COMMENT ON TABLE public.flashcards IS 'Stores the flashcards created by users.';
COMMENT ON COLUMN public.flashcards.id IS 'Primary key for the flashcard.';
COMMENT ON COLUMN public.flashcards.user_id IS 'Foreign key referencing the user who owns the flashcard.';
COMMENT ON COLUMN public.flashcards.category_id IS 'Optional foreign key referencing the category this flashcard belongs to. Set to NULL if the category is deleted.';
COMMENT ON COLUMN public.flashcards.generation_id IS 'Optional foreign key referencing the AI generation task that created this flashcard. NULL for manually created flashcards. Set to NULL if the generation is deleted.';
COMMENT ON COLUMN public.flashcards.question IS 'The question part of the flashcard (max 200 characters).';
COMMENT ON COLUMN public.flashcards.answer IS 'The answer part of the flashcard (max 500 characters).';
COMMENT ON COLUMN public.flashcards.source IS 'Indicates whether the flashcard was created manually or by AI.';
COMMENT ON COLUMN public.flashcards.created_at IS 'Timestamp of when the flashcard was created.';
COMMENT ON COLUMN public.flashcards.updated_at IS 'Timestamp of when the flashcard was last updated.';
```

### `public.generations`

Przechowuje informacje o zadaniach generowania fiszek przez AI.

```sql
CREATE TABLE public.generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_text TEXT NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    status public.generation_status NOT NULL DEFAULT 'pending',
    generated_flashcards JSONB NULL, -- Przechowuje surowy wynik z AI przed akceptacją
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Komentarze do tabeli i kolumn
COMMENT ON TABLE public.generations IS 'Stores information about AI flashcard generation tasks.';
COMMENT ON COLUMN public.generations.id IS 'Primary key for the generation task.';
COMMENT ON COLUMN public.generations.user_id IS 'Foreign key referencing the user who initiated the generation.';
COMMENT ON COLUMN public.generations.source_text IS 'The original text provided by the user for generation.';
COMMENT ON COLUMN public.generations.model_used IS 'Identifier of the AI model used for generation.';
COMMENT ON COLUMN public.generations.status IS 'Current status of the generation task (pending, processing, completed, failed).';
COMMENT ON COLUMN public.generations.generated_flashcards IS 'Raw JSON output from the AI containing suggested flashcards, before user review/acceptance.';
COMMENT ON COLUMN public.generations.created_at IS 'Timestamp of when the generation task was created.';
COMMENT ON COLUMN public.generations.updated_at IS 'Timestamp of when the generation task was last updated.';

```

### `public.generation_error_logs`

Przechowuje logi błędów napotkanych podczas generowania fiszek przez AI.

```sql
CREATE TABLE public.generation_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    error_details JSONB NULL, -- Dodatkowe szczegóły błędu, np. odpowiedź API
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Komentarze do tabeli i kolumn
COMMENT ON TABLE public.generation_error_logs IS 'Logs errors encountered during AI flashcard generation.';
COMMENT ON COLUMN public.generation_error_logs.id IS 'Primary key for the error log entry.';
COMMENT ON COLUMN public.generation_error_logs.generation_id IS 'Foreign key referencing the generation task that failed.';
COMMENT ON COLUMN public.generation_error_logs.error_message IS 'Description of the error.';
COMMENT ON COLUMN public.generation_error_logs.error_details IS 'Optional JSON containing more detailed error information (e.g., API response, stack trace).';
COMMENT ON COLUMN public.generation_error_logs.logged_at IS 'Timestamp of when the error was logged.';

```

## 3. Relacje

- **`categories` do `auth.users`**: Wiele-do-jednego (`categories.user_id` -> `auth.users.id`). Każda kategoria należy do jednego użytkownika. Usunięcie użytkownika powoduje usunięcie jego kategorii (`ON DELETE CASCADE`).
- **`flashcards` do `auth.users`**: Wiele-do-jednego (`flashcards.user_id` -> `auth.users.id`). Każda fiszka należy do jednego użytkownika. Usunięcie użytkownika powoduje usunięcie jego fiszek (`ON DELETE CASCADE`).
- **`flashcards` do `categories`**: Wiele-do-jednego (`flashcards.category_id` -> `categories.id`). Fiszka może (ale nie musi) należeć do jednej kategorii. Przypisanie jest opcjonalne (`NULLABLE`). Usunięcie kategorii powoduje usunięcie powiązania (`ON DELETE SET NULL`), ale nie samej fiszki.
- **`flashcards` do `generations`**: Wiele-do-jednego (`flashcards.generation_id` -> `generations.id`). Fiszka może (ale nie musi) być wygenerowana przez AI. Przypisanie jest opcjonalne (`NULLABLE`) - ręcznie tworzone fiszki mają `generation_id = NULL`. Usunięcie zadania generowania powoduje usunięcie powiązania (`ON DELETE SET NULL`), ale nie samych fiszek.
- **`generations` do `auth.users`**: Wiele-do-jednego (`generations.user_id` -> `auth.users.id`). Każde zadanie generowania należy do jednego użytkownika. Usunięcie użytkownika powoduje usunięcie jego zadań generowania (`ON DELETE CASCADE`).
- **`generation_error_logs` do `generations`**: Wiele-do-jednego (`generation_error_logs.generation_id` -> `generations.id`). Każdy log błędu jest powiązany z jednym zadaniem generowania. Usunięcie zadania generowania powoduje usunięcie powiązanych logów błędów (`ON DELETE CASCADE`).

## 4. Indeksy

Indeksy są tworzone w celu optymalizacji zapytań filtrujących i wyszukujących.

```sql
-- Indeksy dla tabeli categories
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
COMMENT ON INDEX idx_categories_user_id IS 'Index on user_id for faster filtering of categories by owner.';

-- Indeksy dla tabeli flashcards
CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
COMMENT ON INDEX idx_flashcards_user_id IS 'Index on user_id for faster filtering of flashcards by owner.';

CREATE INDEX idx_flashcards_category_id ON public.flashcards(category_id);
COMMENT ON INDEX idx_flashcards_category_id IS 'Index on category_id for faster filtering of flashcards by category.';

CREATE INDEX idx_flashcards_generation_id ON public.flashcards(generation_id);
COMMENT ON INDEX idx_flashcards_generation_id IS 'Index on generation_id for faster filtering of flashcards by their AI generation source.';

-- Indeksy wspierające wyszukiwanie LIKE (rozważenie varchar_pattern_ops dla zapytań 'prefix%')
CREATE INDEX idx_flashcards_question ON public.flashcards(question); -- Standardowy B-tree dla ogólnego LIKE '%term%'
-- CREATE INDEX idx_flashcards_question_pattern ON public.flashcards(question varchar_pattern_ops); -- Alternatywa dla LIKE 'prefix%'
COMMENT ON INDEX idx_flashcards_question IS 'Index on the question column to speed up text searches.';

CREATE INDEX idx_flashcards_answer ON public.flashcards(answer); -- Standardowy B-tree dla ogólnego LIKE '%term%'
-- CREATE INDEX idx_flashcards_answer_pattern ON public.flashcards(answer varchar_pattern_ops); -- Alternatywa dla LIKE 'prefix%'
COMMENT ON INDEX idx_flashcards_answer IS 'Index on the answer column to speed up text searches.';

-- Indeksy dla tabeli generations
CREATE INDEX idx_generations_user_id ON public.generations(user_id);
COMMENT ON INDEX idx_generations_user_id IS 'Index on user_id for faster filtering of generation tasks by owner.';

CREATE INDEX idx_generations_status ON public.generations(status);
COMMENT ON INDEX idx_generations_status IS 'Index on status for faster querying of generation tasks by status.';

-- Indeksy dla tabeli generation_error_logs
CREATE INDEX idx_generation_error_logs_generation_id ON public.generation_error_logs(generation_id);
COMMENT ON INDEX idx_generation_error_logs_generation_id IS 'Index on generation_id for faster retrieval of error logs for a specific generation task.';

```

## 5. Zasady bezpieczeństwa na poziomie wierszy (RLS)

RLS zapewniają, że użytkownicy mogą uzyskiwać dostęp i modyfikować tylko swoje własne dane.

```sql
-- Włączenie RLS dla tabel
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_error_logs ENABLE ROW LEVEL SECURITY;

-- Polityki RLS dla tabeli categories
CREATE POLICY "Allow authenticated users to manage their own categories"
ON public.categories
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Allow authenticated users to manage their own categories" ON public.categories IS 'Users can SELECT, INSERT, UPDATE, DELETE their own categories only.';

-- Polityki RLS dla tabeli flashcards
CREATE POLICY "Allow authenticated users to manage their own flashcards"
ON public.flashcards
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Allow authenticated users to manage their own flashcards" ON public.flashcards IS 'Users can SELECT, INSERT, UPDATE, DELETE their own flashcards only.';

-- Polityki RLS dla tabeli generations
CREATE POLICY "Allow authenticated users to manage their own generations"
ON public.generations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Allow authenticated users to manage their own generations" ON public.generations IS 'Users can SELECT, INSERT, UPDATE, DELETE their own generation tasks only.';

-- Polityki RLS dla tabeli generation_error_logs
-- Użytkownicy mogą widzieć tylko logi błędów powiązane z ich własnymi zadaniami generowania
CREATE POLICY "Allow authenticated users to view error logs for their own generations"
ON public.generation_error_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.generations g
        WHERE g.id = generation_id AND g.user_id = auth.uid()
    )
);

-- Operacje INSERT mogą być wykonywane przez zaufany proces (np. funkcję backendową),
-- dlatego nie tworzymy polityki INSERT opartej bezpośrednio na auth.uid().
-- Polityki UPDATE/DELETE mogą nie być potrzebne dla logów.

COMMENT ON POLICY "Allow authenticated users to view error logs for their own generations" ON public.generation_error_logs IS 'Users can SELECT error logs related to their own generation tasks.';

```

## 6. Funkcje pomocnicze i Triggery

### Trigger do aktualizacji `updated_at`

Automatycznie aktualizuje kolumnę `updated_at` przy każdej zmianie wiersza.

```sql
-- Funkcja triggera
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_updated_at() IS 'Function to automatically update the updated_at timestamp on row modification.';

-- Trigger dla tabeli categories
CREATE TRIGGER on_categories_update
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TRIGGER on_categories_update ON public.categories IS 'Trigger to automatically update updated_at timestamp before updating a category.';

-- Trigger dla tabeli flashcards
CREATE TRIGGER on_flashcards_update
BEFORE UPDATE ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TRIGGER on_flashcards_update ON public.flashcards IS 'Trigger to automatically update updated_at timestamp before updating a flashcard.';

-- Trigger dla tabeli generations
CREATE TRIGGER on_generations_update
BEFORE UPDATE ON public.generations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TRIGGER on_generations_update ON public.generations IS 'Trigger to automatically update updated_at timestamp before updating a generation task.';
```

## 7. Dodatkowe uwagi

- **Użytkownicy**: Zarządzanie użytkownikami (rejestracja, logowanie, reset hasła) jest obsługiwane przez mechanizmy Supabase Auth (`auth.users`, `auth.identities` itp.). Nie ma potrzeby tworzenia dodatkowej tabeli `profiles` w ramach MVP.
- **Generowanie AI**: Dodano tabele `generations` i `generation_error_logs` do śledzenia procesu generowania fiszek przez AI, w tym tekstu źródłowego, użytego modelu, statusu, wyników oraz ewentualnych błędów. Kolumna `generated_flashcards` w tabeli `generations` przechowuje surowe dane JSON z AI do dalszego przetworzenia/akceptacji przez użytkownika. Utworzone i zaakceptowane fiszki są zapisywane w tabeli `flashcards` z odpowiednim `generation_id` wskazującym na ich źródło.
- **Skalowalność**: Dla MVP schemat jest wystarczający. Partycjonowanie tabel nie jest obecnie wymagane, ale może być rozważone w przyszłości przy znacznym wzroście ilości danych.
- **Wyszukiwanie**: Aktualne indeksy wspierają proste wyszukiwanie `LIKE`. W przyszłości, dla bardziej zaawansowanych potrzeb wyszukiwania, można rozważyć implementację PostgreSQL Full-Text Search z indeksami GIN/GiST.
- **UUID vs Serial**: Użycie `UUID` jako kluczy głównych jest zgodne z powszechnymi praktykami w Supabase i ułatwia generowanie unikalnych identyfikatorów po stronie klienta lub w rozproszonym środowisku.
- **CASCADE vs SET NULL**: Wybrano `ON DELETE SET NULL` dla `flashcards.category_id` i `flashcards.generation_id`, aby usunięcie kategorii lub zadania generowania nie powodowało utraty samych fiszek. Wybrano `ON DELETE CASCADE` dla `user_id` (w `categories`, `flashcards`, `generations`) oraz `generation_id` (w `generation_error_logs`), aby usunięcie konta użytkownika lub zadania generowania usuwało wszystkie powiązane z nimi dane, zgodnie z oczekiwaniami dotyczącymi zarządzania danymi.
