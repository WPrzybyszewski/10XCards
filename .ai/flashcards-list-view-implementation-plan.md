## Plan implementacji widoku Lista fiszek

## 1. Przegląd

Widok **Lista fiszek** służy do przeglądania, ręcznego dodawania, edycji i usuwania fiszek użytkownika, zgodnie z PRD i user stories US-006, US-007, US-010. Jest dostępny pod ścieżką `/app/flashcards` dla zalogowanego użytkownika, korzysta z backendowego API (`/api/v1/flashcards`, `/api/v1/categories`) i integruje się wizualnie oraz architektonicznie z istniejącym widokiem generatora (`/app/generator`). Widok musi obsługiwać stany ładowania, błędów oraz stan pusty, zapewniając jasne komunikaty w języku polskim i spójne doświadczenie z resztą aplikacji.

## 2. Routing widoku

- **Ścieżka**: `/app/flashcards`
- **Plik Astro**: `src/pages/app/flashcards.astro`
  - Importuje `Layout.astro` oraz główny komponent React `FlashcardsPage.tsx`.
  - Struktura:
    - `<Layout title="Lista fiszek">`
      - `<FlashcardsPage client:load />`
    - Brak dodatkowej logiki w pliku Astro – cała interaktywność w React.

## 3. Struktura komponentów

- **Warstwa Astro**
  - `Layout` (istniejący)
  - `FlashcardsPage` (nowy komponent React osadzony przez `client:load`)

- **Warstwa React (widok `/app/flashcards`)**
  - `FlashcardsPage`
    - Zarządzanie stanem widoku poprzez `useFlashcardsView`.
    - Renderowanie topbara, głównej zawartości oraz modali.
  - `FlashcardsTopbar`
    - Wspólna nawigacja aplikacji (Generator / Fiszki / Nauka / Kategorie), stylistycznie spójna z `GeneratorPage`.
  - `FlashcardsLayout`
    - Layout sekcji treści: pasek akcji (CTA) + główna karta z listą fiszek.
  - `FlashcardsContent`
    - Logika renderowania odpowiedniego stanu: ładowanie / błąd / stan pusty / tabela.
  - `FlashcardsTable` (lub `FlashcardsList`)
    - Tabela lub lista prezentująca fiszki z akcjami Edytuj / Usuń.
  - `FlashcardsEmptyState`
    - Komunikat i CTA dla sytuacji braku fiszek.
  - `FlashcardsLoadingState`
    - Spinner / skeleton wierszy.
  - `FlashcardsErrorState`
    - Komunikat o błędzie i przycisk „Spróbuj ponownie”.
  - `FlashcardFormModal`
    - Modal formularza dla tworzenia (`create`) i edycji (`edit`) fiszki.
  - `DeleteFlashcardConfirmModal`
    - Modal potwierdzenia usunięcia fiszki.
  - (Opcjonalnie) `FlashcardsToastStack`
    - Stos toastów informujących o sukcesach/błędach, analogiczny do `GeneratorToastStack`.

- **Warstwa logiki / API**
  - `useFlashcardsView` (custom hook zarządzający stanem widoku).
  - `createFlashcardsApi` (warstwa HTTP dla `/api/v1/flashcards` oraz `/api/v1/categories`).
  - Dodatkowe stałe/współdzielone typy (np. limity długości front/back).

## 4. Szczegóły komponentów

### 4.1. `FlashcardsPage`

- **Opis komponentu**: Główny kontener widoku listy fiszek. Inicjuje hook `useFlashcardsView`, przekazuje dane i akcje do komponentów prezentacyjnych oraz montuje modale tworzenia/edycji/usuwania.
- **Główne elementy**:
  - `<div className="flashcards-page">` – główny wrapper.
  - `<FlashcardsTopbar />` – nagłówek z nawigacją.
  - `<main className="flashcards-content" role="main">`
    - `<FlashcardsLayout ...>` – przekazanie akcji i treści.
  - Modale:
    - `<FlashcardFormModal />` w trybie `create` lub `edit`.
    - `<DeleteFlashcardConfirmModal />`.
  - (Opcjonalnie) `<FlashcardsToastStack />`.
- **Obsługiwane interakcje**:
  - Inicjalne załadowanie listy fiszek i kategorii po zamontowaniu (wywołanie `loadFlashcards`, `loadCategories` z hooka).
  - Obsługa kliknięcia „Dodaj fiszkę” → otwarcie modala tworzenia.
  - Obsługa kliknięcia „Edytuj” → otwarcie modala edycji z wypełnionymi danymi.
  - Obsługa kliknięcia „Usuń” → otwarcie modala potwierdzenia.
  - Obsługa akcji z modali (zapis/usuń/anuluj).
- **Obsługiwana walidacja**:
  - Brak walidacji bezpośrednio w tym komponencie – deleguje do formularzy w modalach i hooka.
- **Typy**:
  - `FlashcardsViewState` – stan zwracany z `useFlashcardsView`.
  - `FlashcardListItemViewModel` – dane pojedynczej fiszki do wyświetlenia.
- **Propsy**:
  - Brak zewnętrznych propsów (komponent mountowany w `flashcards.astro` bez parametrów).

### 4.2. `FlashcardsTopbar`

- **Opis komponentu**: Pasek górny z nazwą aplikacji i nawigacją pomiędzy głównymi widokami (`Generator`, `Fiszki`, `Nauka`, `Kategorie`), inspirowany istniejącym topbarem w `GeneratorPage`.
- **Główne elementy**:
  - `<header className="app-topbar" role="banner">`
    - Logo: `Fiszki AI`.
    - `<nav aria-label="Główna nawigacja">`
      - Lista `<ul>` z linkami `<a href="/app/...">`.
    - Slot użytkownika (placeholder jak w generatorze, np. avatar + e-mail).
- **Obsługiwane interakcje**:
  - Kliknięcie w linki nawigacji → nawigacja do odpowiednich widoków (standardowy mechanizm przeglądarki).
- **Obsługiwana walidacja**:
  - Brak walidacji.
- **Typy**:
  - `NavLink = { label: string; href: string; requiresCollections?: boolean }`.
- **Propsy**:
  - `activeHref: string` – aktualnie aktywna ścieżka (`"/app/flashcards"`), używana do ustawienia klas `active` i `aria-current="page"`.

### 4.3. `FlashcardsLayout`

- **Opis komponentu**: Strukturalny layout zawartości widoku listy fiszek. Odpowiada za rozmieszczenie nagłówka sekcji, paska akcji (np. przycisk „Dodaj fiszkę”) oraz samej listy.
- **Główne elementy**:
  - `<section className="flashcards-layout">`
    - Górny pasek:
      - Tytuł, np. „Twoje fiszki”.
      - Główne CTA: `Button` „Dodaj fiszkę”.
    - Główny panel:
      - `<div className="flashcards-panel">`
        - `<FlashcardsContent />` (renderowane jako children lub prop).
    - (Opcjonalnie) panel boczny na przyszłość (np. krótkie statystyki lub linki).
- **Obsługiwane interakcje**:
  - Kliknięcie w przycisk „Dodaj fiszkę” → `onAddFlashcard`.
- **Obsługiwana walidacja**:
  - Brak walidacji (layout).
- **Typy**:
  - `FlashcardsLayoutProps`:
    - `content: ReactNode`
    - `onAddFlashcard: () => void`
    - (opcjonalnie) `sidebar?: ReactNode`
- **Propsy**:
  - `content` – komponent renderujący aktualny stan (loading/error/empty/table).
  - `onAddFlashcard` – callback z `useFlashcardsView`.

### 4.4. `FlashcardsContent`

- **Opis komponentu**: Mała warstwa logiczna odpowiadająca za wybór odpowiedniego widoku w zależności od stanu (`isLoading`, `error`, `items.length`).
- **Główne elementy**:
  - Renderuje jedno z:
    - `<FlashcardsLoadingState />`
    - `<FlashcardsErrorState />`
    - `<FlashcardsEmptyState />`
    - `<FlashcardsTable />`
- **Obsługiwane interakcje**:
  - `onRetry` (przekazywany do `FlashcardsErrorState`).
  - `onAddClick`, `onGoToGenerator` (przekazywane do `FlashcardsEmptyState`).
  - `onEdit`, `onDelete` (przekazywane do `FlashcardsTable`).
- **Obsługiwana walidacja**:
  - Brak – tylko wybór stanu.
- **Typy**:
  - `FlashcardsContentProps` z polami:
    - `isLoading`, `error`, `items`, `onRetry`, `onAddClick`, `onGoToGenerator`, `onEdit`, `onDelete`.
- **Propsy**:
  - Jak wyżej; wszystkie dane i callbacki pochodzą z `useFlashcardsView`.

### 4.5. `FlashcardsTable`

- **Opis komponentu**: Prezentacyjna tabela lub lista kart, spełniająca wymagania: pokazuje przynajmniej front i kategorię, ewentualnie datę utworzenia, oraz przyciski do edycji/usunięcia.
- **Główne elementy**:
  - `<table className="flashcards-table">` lub lista `<ul className="flashcards-list">`.
  - Nagłówki kolumn (dla tabeli):
    - Front
    - Kategoria
    - Data utworzenia
    - Akcje
  - Wiersze:
    - Każdy wiersz odzwierciedla `FlashcardListItemViewModel`.
    - Front może być skracany (np. CSS `text-overflow: ellipsis`).
    - Przyciski (lub ikony) `Edytuj`, `Usuń`.
- **Obsługiwane interakcje**:
  - Kliknięcie „Edytuj” → `onEdit(id)`.
  - Kliknięcie „Usuń” → `onDelete(id)`.
- **Obsługiwana walidacja**:
  - Brak logiki walidacyjnej – tylko prezentacja danych.
- **Typy**:
  - `FlashcardListItemViewModel`:
    - `id: string`
    - `front: string`
    - `frontPreview?: string`
    - `back: string`
    - `categoryId: string`
    - `categoryName: string`
    - `createdAt: string`
    - `createdAtLabel: string`
    - `isUpdating?: boolean`
    - `isDeleting?: boolean`
- **Propsy**:
  - `items: FlashcardListItemViewModel[]`
  - `onEdit(id: string): void`
  - `onDelete(id: string): void`

### 4.6. `FlashcardsEmptyState`

- **Opis komponentu**: Widok wyświetlany, gdy użytkownik nie ma jeszcze żadnych fiszek. Zawiera empatetyczny komunikat i dwie główne akcje.
- **Główne elementy**:
  - Tekst, np.: „Nie masz jeszcze żadnych fiszek.”
  - Podtekst: „Dodaj pierwszą fiszkę lub skorzystaj z generatora, aby szybko stworzyć zestaw.”
  - Przycisk `Dodaj pierwszą fiszkę`.
  - Przycisk `Przejdź do generatora`.
- **Obsługiwane interakcje**:
  - `onAddClick` – otwiera modal tworzenia.
  - `onGoToGenerator` – nawigacja do `/app/generator`.
- **Obsługiwana walidacja**:
  - Brak.
- **Typy**:
  - `FlashcardsEmptyStateProps`:
    - `onAddClick: () => void`
    - `onGoToGenerator: () => void`
- **Propsy**:
  - Jak wyżej.

### 4.7. `FlashcardsLoadingState`

- **Opis komponentu**: Prezentuje spinner lub skeleton wierszy, gdy lista fiszek jest w trakcie ładowania.
- **Główne elementy**:
  - Spinner (np. prosty CSS) lub kilka skeleton-ów imitujących wiersze tabeli.
- **Obsługiwane interakcje**:
  - Brak.
- **Obsługiwana walidacja**:
  - Brak.
- **Typy / Propsy**:
  - Brak lub proste opcjonalne parametry (np. liczba skeletonów).

### 4.8. `FlashcardsErrorState`

- **Opis komponentu**: Pokazuje komunikat błędu, gdy nie udało się załadować listy, i umożliwia użytkownikowi ponowną próbę.
- **Główne elementy**:
  - Tekst błędu, np. „Nie udało się załadować fiszek.”
  - Szczegółowy komunikat (jeśli dostępny) – np. `message` z backendu.
  - Przycisk `Spróbuj ponownie`.
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku → `onRetry()`.
- **Obsługiwana walidacja**:
  - Brak.
- **Typy**:
  - `FlashcardsErrorStateProps`:
    - `message?: string`
    - `onRetry: () => void`
- **Propsy**:
  - Jak wyżej.

### 4.9. `FlashcardFormModal`

- **Opis komponentu**: Modal z formularzem tworzenia/edycji fiszki. Zapewnia walidację pól zgodną z backendem, liczniki znaków i czytelne komunikaty błędów.
- **Główne elementy**:
  - Modal (np. Shadcn `Dialog` lub prosty custom modal).
  - Formularz z polami:
    - `front` – `textarea` lub `input`.
    - `back` – `textarea`.
    - `categoryId` – `select` (lista kategorii).
  - Liczniki znaków przy `front` i `back` (np. `x / 200` i `x / 500`).
  - Komunikaty błędów przy polach + ew. globalny błąd.
  - Przyciski `Anuluj` i `Zapisz`.
- **Obsługiwane interakcje**:
  - Wpisywanie/edycja pól → aktualizacja lokalnego stanu formularza.
  - Kliknięcie `Zapisz`:
    - Walidacja po stronie klienta.
    - Jeśli poprawne → wywołanie `onSubmit(values)`.
  - Kliknięcie `Anuluj` → `onCancel`.
- **Obsługiwana walidacja**:
  - Front:
    - Po `trim()`: długość w zakresie [1, 200].
    - Komunikat np.: „Front musi mieć od 1 do 200 znaków.”
  - Back:
    - Po `trim()`: długość w zakresie [1, 500].
    - Komunikat np.: „Back musi mieć od 1 do 500 znaków.”
  - CategoryId:
    - Wymagane – nie może być puste.
    - Komunikat np.: „Wybierz kategorię.”
  - Przycisk `Zapisz` zablokowany, jeśli występują błędy lub formularz jest w trakcie wysyłania (`isSubmitting`).
- **Typy**:
  - `FlashcardFormMode = "create" | "edit"`.
  - `FlashcardFormValues`:
    - `categoryId: string`
    - `front: string`
    - `back: string`
  - `FlashcardFormModalProps`:
    - `mode: FlashcardFormMode`
    - `initialValues?: FlashcardFormValues`
    - `categories: CategoryOption[]`
    - `isOpen: boolean`
    - `isSubmitting: boolean`
    - `onSubmit(values: FlashcardFormValues): Promise<void> | void`
    - `onCancel(): void`
- **Propsy**:
  - Jak wyżej – komponent kontrolowany przez `FlashcardsPage`/`useFlashcardsView`.

### 4.10. `DeleteFlashcardConfirmModal`

- **Opis komponentu**: Prostym modal potwierdzenia usunięcia fiszki. Zapobiega przypadkowemu usunięciu (wymóg PRD).
- **Główne elementy**:
  - Tekst, np.: „Czy na pewno chcesz usunąć tę fiszkę?”
  - (Opcjonalnie) mały podgląd frontu fiszki.
  - Przycisk `Anuluj`.
  - Przycisk `Usuń` (akcentowany, np. kolor czerwony).
- **Obsługiwane interakcje**:
  - Kliknięcie `Anuluj` → `onCancel`.
  - Kliknięcie `Usuń` → `onConfirm`.
- **Obsługiwana walidacja**:
  - Brak – tylko potwierdzenie.
- **Typy**:
  - `DeleteFlashcardConfirmModalProps`:
    - `isOpen: boolean`
    - `frontPreview?: string`
    - `isDeleting: boolean`
    - `onConfirm(): void`
    - `onCancel(): void`
- **Propsy**:
  - Jak wyżej.

### 4.11. (Opcjonalnie) `FlashcardsToastStack`

- **Opis komponentu**: Stos toastów informujących o wynikach operacji (utworzenie, edycja, usunięcie, błędy API), podobny do `GeneratorToastStack`.
- **Główne elementy**:
  - Lista toastów (np. w prawym dolnym rogu).
  - Każdy toast ma wariant (`info`, `success`, `error`) i tekst.
- **Obsługiwane interakcje**:
  - Automatyczne wygaszanie toastów po kilku sekundach (closure w hooku).
  - Możliwość ręcznego zamknięcia (krzyżyk).
- **Obsługiwana walidacja**:
  - Brak.
- **Typy**:
  - `ToastVariant = "info" | "success" | "error"`.
  - `ToastMessage = { id: string; variant: ToastVariant; message: string }`.
  - `FlashcardsToastStackProps = { toasts: ToastMessage[]; onDismiss(id: string): void }`.
- **Propsy**:
  - Jak wyżej.

## 5. Typy

### 5.1. Typy istniejące (z `src/types.ts`)

- **FlashcardDTO**
  - `id: string`
  - `category_id: string`
  - `front: string`
  - `back: string`
  - `source: "manual" | "ai"`
  - `created_at: string`
  - `updated_at: string`
- **FlashcardsOrder**
  - `'created_desc' | 'created_asc'`
- **ListFlashcardsQueryDTO**
  - `category_id?: string`
  - `limit?: number`
  - `offset?: number`
  - `order?: FlashcardsOrder`
- **ListFlashcardsResponseDTO**
  - `items: FlashcardDTO[]`
  - `limit: number`
  - `offset: number`
  - `total: number | null`
- **CreateFlashcardCommand**
  - `category_id: string`
  - `front: string`
  - `back: string`
- **CreateFlashcardResponseDTO**
  - `FlashcardDTO`
- **UpdateFlashcardCommand**
  - `category_id?: string`
  - `front?: string`
  - `back?: string`
- **UpdateFlashcardResponseDTO**
  - `FlashcardDTO`
- **CategoryDTO** (na podstawie typów kategorii)
  - `id: string`
  - `name: string`
  - (pozostałe pola ignorujemy w tym widoku)

### 5.2. Nowe typy ViewModel / UI

- **CategoryOption**
  - `id: string`
  - `name: string`
  - Uproszczony typ do wykorzystania w `select` i mapowaniu kategorii.

- **FlashcardListItemViewModel**
  - `id: string` – identyfikator fiszki.
  - `front: string` – pełna treść frontu, do użycia w podglądzie lub formularzu.
  - `frontPreview?: string` – skrócona wersja do prezentacji w tabeli (np. max 80 znaków).
  - `back: string` – treść tyłu karty (do wypełnienia formularza edycji).
  - `categoryId: string` – identyfikator kategorii.
  - `categoryName: string` – nazwa kategorii (zmapowana z `CategoryDTO`).
  - `createdAt: string` – surowa data z backendu (`created_at`).
  - `createdAtLabel: string` – sformatowana data (np. `DD.MM.RRRR`).
  - `isUpdating?: boolean` – flaga używana przy zapisie zmian na fiszce.
  - `isDeleting?: boolean` – flaga używana przy usuwaniu.

- **FlashcardsViewState**
  - `items: FlashcardListItemViewModel[]`
  - `isLoading: boolean` – stan ładowania listy (pierwotny i kolejne refetch-e).
  - `error: string | null` – komunikat błędu przy ładowaniu listy.
  - `categories: CategoryOption[]`
  - `isCategoriesLoading: boolean`
  - `pagination: { limit: number; offset: number; total: number | null }`
  - `order: FlashcardsOrder`
  - `isCreateModalOpen: boolean`
  - `isEditModalOpen: boolean`
  - `isDeleteModalOpen: boolean`
  - `currentEditingId: string | null`
  - `currentDeletingId: string | null`
  - `isSubmitting: boolean` – stan zapisu create/edit.
  - `isDeleting: boolean` – stan usuwania.
  - (opcjonalnie) `toasts: ToastMessage[]`

- **FlashcardFormValues**
  - `categoryId: string`
  - `front: string`
  - `back: string`

- **FlashcardsApiParams**
  - `limit?: number`
  - `offset?: number`
  - `order?: FlashcardsOrder`
  - `category_id?: string`

### 5.3. Interfejs API frontendu

- **FlashcardsApi**
  - `list(params: FlashcardsApiParams): Promise<ListFlashcardsResponseDTO>`
  - `create(command: CreateFlashcardCommand): Promise<CreateFlashcardResponseDTO>`
  - `update(id: string, command: UpdateFlashcardCommand): Promise<UpdateFlashcardResponseDTO>`
  - `delete(id: string): Promise<void>` (obsługa 204 bez body)
  - `listCategories(): Promise<CategoryDTO[]>`

## 6. Zarządzanie stanem

- **Główny hook: `useFlashcardsView`**
  - Odpowiada za:
    - Załadowanie listy fiszek przy montowaniu widoku (`useEffect` → `api.list`).
    - Załadowanie kategorii (`api.listCategories`), reużycie typu `CategoryOption`.
    - Przechowywanie i aktualizację stanu `FlashcardsViewState`.
    - Akcje: `openCreateModal`, `openEditModal`, `openDeleteModal`, `close*Modal`.
    - Operacje CRUD: `createFlashcard`, `updateFlashcard`, `deleteFlashcard`.
    - Obsługę błędów i ewentualnych toastów.
  - Implementacja:
    - Wzorowana na `useGeneratorView`:
      - Użycie `useState` dla tablic i flag.
      - Użycie `useCallback` dla funkcji asynchronicznych.
      - Możliwe wykorzystanie `useMemo` do wyliczania pochodnych wartości (np. `hasItems`).

- **Stan formularza w `FlashcardFormModal`**
  - Może używać `react-hook-form` (spójność z generatorem) lub prostego `useState`.
  - Dla spójności z projektem sugerowane jest użycie `react-hook-form`:
    - `useForm<FlashcardFormValues>`.
    - Walidacja custom w `handleSubmit` (sprawdzenie długości / wymaganych pól).

- **Zależności między stanem listy i formularzem**
  - `useFlashcardsView` przygotowuje `initialValues` formularza na podstawie `FlashcardListItemViewModel` (dla edycji).
  - Po udanym create/edit:
    - Aktualizacja `items` w hooku (`setItems`).
    - Zamknięcie odpowiedniego modala.
    - Opcjonalnie dodanie toastu `success`.

## 7. Integracja API

### 7.1. Warstwa API (`createFlashcardsApi`)

- Plik: `src/react/flashcards/api.ts` (analogicznie do `generator/api.ts`).
- Wspólny helper:
  - `parseJson<T>(response: Response): Promise<T>` – jak w generatorze.
  - `handleResponse<T>(response: Response): Promise<T>` – dla odpowiedzi z body.
  - `handleNoContent(response: Response): Promise<void>` – dla 204 (sprawdza `response.ok`, nie próbuje parsować JSON).

- Metody:
  - `async function listFlashcards(params: FlashcardsApiParams): Promise<ListFlashcardsResponseDTO>`
    - Buduje query string na podstawie `params`.
    - `fetch("/api/v1/flashcards?...")` z `credentials: "include"`.
    - Używa `handleResponse<ListFlashcardsResponseDTO>`.
  - `async function createFlashcard(command: CreateFlashcardCommand): Promise<CreateFlashcardResponseDTO>`
    - `POST /api/v1/flashcards` z `Content-Type: application/json`.
    - Body: `JSON.stringify(command)`.
  - `async function updateFlashcard(id: string, command: UpdateFlashcardCommand): Promise<UpdateFlashcardResponseDTO>`
    - `PATCH /api/v1/flashcards/${id}`.
  - `async function deleteFlashcard(id: string): Promise<void>`
    - `DELETE /api/v1/flashcards/${id}`.
    - Sprawdza `response.ok`; brak body.
  - `async function listCategories(): Promise<CategoryDTO[]>`
    - Reużywa logiki z `generator/api.ts`:
      - `GET /api/v1/categories?limit=100&offset=0`.
      - Zwraca `body.items`.

- Wszystkie metody używają `credentials: "include"` i dla błędów rzucają `Error` z komunikatem użytkowym (z pola `message` lub domyślnym).

### 7.2. Typy żądań i odpowiedzi

- **Żądania**
  - `GET /api/v1/flashcards`:
    - Query:
      - `limit` (domyślnie 50).
      - `offset` (domyślnie 0).
      - `order` (domyślnie `created_desc`).
      - `category_id` (opcjonalnie; w MVP nie jest ustawiane z UI).
  - `POST /api/v1/flashcards`:
    - Body: `CreateFlashcardCommand`.
  - `PATCH /api/v1/flashcards/:id`:
    - Body: `UpdateFlashcardCommand`.
  - `DELETE /api/v1/flashcards/:id`:
    - Brak body.
  - `GET /api/v1/categories`:
    - Query: `limit`, `offset` (np. 100 i 0).

- **Odpowiedzi**
  - `GET /api/v1/flashcards`:
    - `ListFlashcardsResponseDTO` – `items`, `limit`, `offset`, `total`.
  - `POST /api/v1/flashcards`:
    - `CreateFlashcardResponseDTO` – pojedyncza `FlashcardDTO`.
  - `PATCH /api/v1/flashcards/:id`:
    - `UpdateFlashcardResponseDTO` – zaktualizowana `FlashcardDTO`.
  - `DELETE /api/v1/flashcards/:id`:
    - Status `204 No Content`.
  - `GET /api/v1/categories`:
    - `ListCategoriesResponseDTO` – `items: CategoryDTO[]`, meta paginacji.

## 8. Interakcje użytkownika

- **Wejście na `/app/flashcards`**
  - UI wyświetla topbar i stan ładowania listy.
  - Po sukcesie:
    - Jeśli są fiszki → tabela.
    - Jeśli `items.length === 0` → stan pusty.
  - Po błędzie → `FlashcardsErrorState` z przyciskiem `Spróbuj ponownie`.

- **Kliknięcie „Dodaj fiszkę”**
  - Otwiera `FlashcardFormModal` w trybie `create` z pustymi wartościami.
  - Użytkownik wypełnia formularz; UI pokazuje liczniki znaków i błędy.
  - Po kliknięciu `Zapisz`:
    - Wywoływana jest `createFlashcard`.
    - Przy sukcesie:
      - Modal się zamyka.
      - Nowa fiszka pojawia się w `items` (na górze, zgodnie z `created_desc`).
      - Opcjonalnie toast „Fiszka została utworzona”.
    - Przy błędzie:
      - Wyświetlany toast / komunikat.

- **Kliknięcie „Edytuj” przy wierszu**
  - Otwiera `FlashcardFormModal` w trybie `edit` z wartościami z wybranej fiszki.
  - Po `Zapisz`:
    - Wywoływana jest `updateFlashcard`.
    - Przy sukcesie:
      - Aktualizacja odpowiedniego elementu w `items`.
      - Zamknięcie modala.
      - Opcjonalny toast „Fiszka została zaktualizowana”.

- **Kliknięcie „Usuń” przy wierszu**
  - Otwiera `DeleteFlashcardConfirmModal`.
  - Po potwierdzeniu:
    - Wywoływana jest `deleteFlashcard`.
    - Przy sukcesie:
      - Usunięcie fiszki z `items`.
      - Zamknięcie modala.
      - Opcjonalny toast „Fiszka została usunięta”.
    - Przy błędzie (np. 404, 500):
      - Wyświetlenie komunikatu.
      - Opcjonalny refetch listy dla synchronizacji.

- **Stan pusty**
  - `FlashcardsEmptyState` pokazuje:
    - Przycisk `Dodaj pierwszą fiszkę` → `openCreateModal`.
    - Przycisk `Przejdź do generatora` → przejście na `/app/generator`.

- **Błąd ładowania listy**
  - `FlashcardsErrorState` z przyciskiem `Spróbuj ponownie` → ponowne wywołanie `loadFlashcards`.

## 9. Warunki i walidacja

- **Walidacja front/back zgodna z API**
  - Warunki:
    - `front.trim().length` między 1 a 200.
    - `back.trim().length` między 1 a 500.
  - Implementacja:
    - Stałe: `FRONT_MIN_LENGTH = 1`, `FRONT_MAX_LENGTH = 200`, `BACK_MIN_LENGTH = 1`, `BACK_MAX_LENGTH = 500`.
    - W `FlashcardFormModal`:
      - Przy zmianie wartości aktualizowane są liczniki.
      - Przy próbie zapisu sprawdzane są długości; w razie naruszenia ustawiane są błędy pól i blokowany jest zapis.

- **Walidacja kategorii**
  - Warunki:
    - `category_id` wymagane, musi być poprawnym UUID istniejącej kategorii użytkownika (sprawdzane ostatecznie w backendzie).
  - Implementacja:
    - Formularz nie pozwala zapisać, jeśli `categoryId` nie jest ustawione.
    - Jeżeli lista kategorii nie załadowała się, formularz może:
      - Zablokować przycisk `Zapisz` z komunikatem „Brak kategorii – spróbuj odświeżyć.”

- **Walidacja parametrów listowania**
  - Warunki:
    - `limit` w zakresie 1–200, `offset` ≥ 0, `order` w zbiorze `["created_desc", "created_asc"]`.
  - Implementacja:
    - W hooks: wartości utrzymywane jako typowane liczby i enumeracje.
    - Brak jawnego wejścia użytkownika (w MVP limit/offset/order są zarządzane programowo).

- **Walidacja działań usuwania**
  - Warunki:
    - Użytkownik musi potwierdzić usunięcie (modal).
  - Implementacja:
    - Bezpośrednie kliknięcie „Usuń” w wierszu nie wysyła requestu, a jedynie otwiera modal potwierdzenia.

## 10. Obsługa błędów

- **Błędy HTTP (400, 401, 404, 500)**
  - Parsowanie:
    - `handleResponse` próbuje zparsować JSON i odczytuje `message`.
    - Dla 401 można rozpoznać status i rzucić specyficzną wiadomość („Musisz być zalogowany, aby zobaczyć swoje fiszki.”).
  - UI:
    - Dla błędu ładowania listy:
      - Wyświetlenie `FlashcardsErrorState`.
    - Dla błędów formularza create/edit:
      - Pokazanie toastu z treścią błędu.
      - Ewentualnie globalny komunikat w modalnym formularzu.

- **Błędy sieciowe (brak połączenia, timeout)**
  - Obsługa:
    - Catch w warstwie API → rzucenie `Error("Nie udało się połączyć z serwerem.")`.
    - Wyświetlenie przyjaznego komunikatu.

- **Błędy walidacji po stronie backendu**
  - Scenariusz:
    - Np. backend zwraca 400 z komunikatem walidacyjnym.
  - Obsługa:
    - Wyświetlenie komunikatu z backendu jako globalnego błędu (np. toast error).
    - W MVP nie ma obowiązku mapowania na konkretne pola.

- **Błędy podczas usuwania (404)**
  - Scenariusz:
    - Fiszka została już usunięta.
  - Obsługa:
    - Komunikat „Fiszka nie została znaleziona. Odśwież listę.”
    - Refetch listy.

## 11. Kroki implementacji

1. **Routing i szkielet widoku**
   - Utwórz plik `src/pages/app/flashcards.astro` analogiczny do `generator.astro`, importujący `Layout` i `FlashcardsPage`.
   - Dodaj wpis `/app/flashcards` do nawigacji w topbarze (w nowym `FlashcardsTopbar` lub we wspólnym komponencie nawigacji).

2. **Struktura React dla widoku listy**
   - Utwórz folder `src/react/flashcards/` z plikami:
     - `FlashcardsPage.tsx`
     - `api.ts`
     - `types.ts` (dla typów ViewModel/Api jeśli potrzebne lokalnie)
     - `useFlashcardsView.ts`
     - podfolder `components/` na komponenty prezentacyjne (layout, tabelę, modale, stany).

3. **Warstwa API (`api.ts`)**
   - Zaimplementuj funkcje `listFlashcards`, `createFlashcard`, `updateFlashcard`, `deleteFlashcard`, `listCategories` z użyciem `fetch`, `credentials: "include"` oraz helpera `handleResponse`.
   - Upewnij się, że `deleteFlashcard` poprawnie obsługuje status 204.

4. **Hook `useFlashcardsView`**
   - Zaimplementuj stan `FlashcardsViewState` oraz akcje:
     - `loadFlashcards`, `reloadFlashcards`.
     - `openCreateModal`, `openEditModal`, `openDeleteModal`, plus odpowiadające im `close*`.
     - `createFlashcard(values)`, `updateFlashcard(id, values)`, `deleteFlashcard(id)`.
   - Zapewnij mapowanie `FlashcardDTO` → `FlashcardListItemViewModel`, w tym `categoryName` bazujące na `CategoryOption[]`.

5. **Komponenty layoutu i tabeli**
   - Zaimplementuj `FlashcardsTopbar` na wzór topbaru generatora (z właściwym `active`).
   - Zaimplementuj `FlashcardsLayout`, `FlashcardsContent` oraz `FlashcardsTable`.
   - Zadbaj o podstawowe responsywne stylowanie (Tailwind / CSS moduł dedykowany np. `flashcards.css`).

6. **Stany pusty, ładowania i błędu**
   - Dodaj `FlashcardsEmptyState`, `FlashcardsLoadingState` oraz `FlashcardsErrorState`.
   - Podłącz je do `FlashcardsContent` zgodnie z wartościami stanu z `useFlashcardsView`.

7. **Formularz i modal tworzenia/edycji**
   - Zaimplementuj `FlashcardFormModal` z użyciem `react-hook-form` lub `useState`.
   - Dodaj walidację front/back/kategorii po stronie klienta (zgodną z backendem) oraz liczniki znaków.
   - Podłącz komponent do `FlashcardsPage` oraz akcji `createFlashcard`/`updateFlashcard`.

8. **Modal potwierdzenia usunięcia**
   - Zaimplementuj `DeleteFlashcardConfirmModal` z prostym UI i integracją z akcją `deleteFlashcard`.
   - Upewnij się, że UI blokuje ponowną próbę usunięcia podczas oczekiwania (stan `isDeleting`).

9. **Obsługa błędów i UX**
   - Zintegruj obsługę błędów z hooka (np. toasty lub komunikaty inline).
   - Zapewnij czytelne teksty błędów w języku polskim.

10. **Stylowanie i dostępność**
    - Wprowadź klasy CSS/Tailwind spójne z istniejącym widokiem generatora (kolory, spacing, typografia).
    - Dodaj atrybuty ARIA (role, `aria-current`, `aria-modal`, etykiety przycisków).

11. **Testy**
    - Dodaj testy jednostkowe dla `useFlashcardsView` (scenariusze: udane ładowanie, błąd ładowania, create/edit/delete).
    - Przygotuj scenariusz E2E w Playwright:
      - Logowanie → wejście na `/app/flashcards` → dodanie fiszki → edycja → usunięcie → weryfikacja stanów pustego i błędów.

12. **Refaktoryzacja wspólnych elementów (opcjonalnie)**
    - Rozważ wyodrębnienie wspólnej logiki HTTP (`handleResponse`, `parseJson`) i topbaru do współdzielonych modułów (`src/lib/http`, wspólny komponent nawigacji).
    - Upewnij się, że docelowa struktura jest zgodna z konwencjami projektu (Astro + React + Tailwind + Shadcn/ui).
