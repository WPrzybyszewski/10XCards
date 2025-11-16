# Plan implementacji widoku Generator fiszek AI

## 1. Przegląd

Widok **Generator fiszek AI** (`/app/generator`) jest głównym ekranem aplikacji po zalogowaniu. Umożliwia wklejenie dłuższego tekstu (1000–10000 znaków), wysłanie go do backendu, otrzymanie dokładnie trzech propozycji fiszek z AI, ich edycję, wybór kategorii oraz akceptację lub odrzucenie poszczególnych propozycji. Widok musi ściśle realizować wymagania z historyjek **US-008** i **US-009** oraz kontraktów API:

- `POST /api/v1/flashcards/generate` – generowanie propozycji (używa `GenerateFlashcardsCommand` / `GenerateFlashcardsResponseDTO`),
- `POST /api/v1/flashcards/accept` – akceptacja pojedynczej propozycji (używa `AcceptFlashcardProposalCommand` / `AcceptFlashcardProposalResponseDTO`),
- `GET /api/v1/categories` – potrzebne do wyboru kategorii (`ListCategoriesResponseDTO`).

Widok powinien:
- prowadzić użytkownika przez główną ścieżkę „auth → generate → accept → learn”,
- zapewnić jasną walidację długości inputu oraz front/back,
- wyraźnie komunikować błędy (toasty) i stany ładowania (spinnery),
- nie ujawniać szczegółów technicznych błędów oraz nie operować na `user_id` po stronie UI.


## 2. Routing widoku

- Ścieżka: **`/app/generator`**.
- Widok jest dostępny wyłącznie dla zalogowanych użytkowników:
  - musi być objęty guardem autoryzacji (np. warstwa layoutu `/app/*` lub HOC/route-guard),
  - w przypadku braku ważnej sesji lub odpowiedzi `401` z API widok nie powinien się renderować, a globalny interceptor powinien przekierować do `/auth`.
- Widok jest renderowany wewnątrz głównego layoutu aplikacji (topbar + content), jako główny „landing” po zalogowaniu.


## 3. Struktura komponentów

Wysokopoziomowe drzewo komponentów (tylko dla widoku `/app/generator`):

- `AppShell` (layout dla `/app/*`)
  - `Topbar`
  - `ToastsContainer`
  - `GeneratorPage` (**widok docelowy**)
    - `GeneratorLayout` (układ kolumn: główny panel + boczny panel pomocniczy)
      - `GeneratorInputPanel`
        - `GeneratorTextarea` (textarea + licznik znaków + hint)
        - `GeneratorActionsBar`
          - `GenerateButton` (z obsługą spinnera i disabled)
          - (opcjonalnie) `ClearInputButton`
        - (opcjonalnie) `ValidationMessage` dla inputu
      - `GeneratorProposalsPanel`
        - `ProposalCard` × 3
          - `ProposalFrontField` (input/textarea + licznik znaków)
          - `ProposalBackField` (textarea + licznik znaków)
          - `ProposalCategorySelect` (dropdown z kategoriami)
          - `ProposalActions`
            - `AcceptButton` (z obsługą spinnera i disabled)
            - `RejectButton`
      - `GeneratorSidebar`
        - `GuidelinesSection` (tips jak pisać dobre fiszki)
        - `LimitsInfo` (limity znaków, zakres długości inputu)
        - (opcjonalnie) `SessionLogPreview` (np. skrót ostatnich generacji/błędów – MVP: tekst statyczny lub prosta lista w pamięci)


## 4. Szczegóły komponentów

### 4.1. `GeneratorPage`

- **Opis komponentu**  
  Główny komponent widoku `/app/generator`. Odpowiada za:
  - inicjalne pobranie kategorii,
  - zarządzanie stanem inputu, propozycji oraz statusów ładowania,
  - orkiestrację wywołań API `generate` i `accept`,
  - przekazywanie danych i handlerów do komponentów dzieci.

- **Główne elementy**:
  - wrapper layoutu widoku (np. `main` / `section`),
  - `GeneratorLayout` z odpowiednimi propsami (input, proposals, sidebar).

- **Obsługiwane interakcje**:
  - wpisywanie/wklejanie tekstu do inputu,
  - kliknięcie „Generuj fiszki”,
  - edycja pól front/back propozycji,
  - wybór kategorii dla propozycji,
  - akceptacja / odrzucenie propozycji.

- **Obsługiwana walidacja**:
  - długość inputu: `1000 <= trimmedLength <= 10000` (blokuje wysyłkę, pokazuje komunikat),
  - dodatkowo blokada przycisku „Generuj” jeśli input nie spełnia warunku,
  - walidacja front/back i kategorii delegowana niżej (do kart propozycji) – ale `GeneratorPage` może agregować informację o tym, czy dana propozycja jest aktualnie zapisywalna (np. `isValid`).

- **Typy**:
  - `GenerateFlashcardsCommand` (żądanie):
    - `input: string`.
  - `GenerateFlashcardsResponseDTO` (odpowiedź):
    - `generation_id: GenerationId`,
    - `proposals: GenerationProposalDTO[]`.
  - `GenerationProposalDTO`:
    - `id: GenerationProposalId`,
    - `index: number`,
    - `front: string`,
    - `back: string`.
  - `AcceptFlashcardProposalCommand`:
    - `generation_id: GenerationId`,
    - `proposal_id: GenerationProposalId`,
    - `category_id: CategoryId`,
    - `front: string`,
    - `back: string`.
  - `AcceptFlashcardProposalResponseDTO`:
    - `flashcard: FlashcardDTO`.
  - `CategoryDTO`:
    - `id`, `name`, `created_at`, `updated_at`.

- **Propsy**:  
  `GeneratorPage` jest komponentem routowanym – propsy z rodzica to głównie kontekst (np. `user`, ewentualnie DI usług HTTP), natomiast w samym planie można założyć:
  - `httpClient` / `apiClient` (abstrakcja nad `fetch`),
  - (opcjonalnie) `toast` / `useToast` hook z biblioteki UI,
  - brak zewnętrznych danych – reszta jest ładowana przez komponent.


### 4.2. `GeneratorLayout`

- **Opis**  
  Prezentacyjny layout dzielący widok na trzy główne obszary: input, panel propozycji i boczny panel pomocniczy.
- **Główne elementy**:
  - kontener `div` z układem np. grid/flex: `InputPanel`, `ProposalsPanel`, `Sidebar`.
- **Interakcje**  
  Brak logiki domenowej; przekazuje zdarzenia w górę.
- **Walidacja**  
  Brak – za walidację odpowiadają dzieci.
- **Typy i propsy**:
  - `inputPanelProps: GeneratorInputPanelProps`,
  - `proposalsPanelProps: GeneratorProposalsPanelProps`,
  - `sidebarProps: GeneratorSidebarProps`.


### 4.3. `GeneratorInputPanel`

- **Opis**  
  Panel odpowiedzialny za wprowadzanie tekstu wejściowego oraz uruchomienie generowania.
- **Główne elementy**:
  - `GeneratorTextarea` (textarea + licznik znaków),
  - `GeneratorActionsBar` z przyciskiem „Generuj fiszki” (i ewentualnym „Wyczyść”),
  - miejsce na komunikat walidacyjny (np. czerwony tekst pod polem).
- **Obsługiwane interakcje**:
  - `onChangeInput(value: string)` – aktualizacja stanu inputu,
  - `onGenerate()` – próbę uruchomienia generowania.
- **Walidacja**:
  - Input jest oznaczany jako niepoprawny, jeśli `trimmedLength < 1000` lub `> 10000`.
  - Przycisk „Generuj” jest disabled, jeśli:
    - input nie spełnia zakresu długości,
    - albo trwa generowanie (stan ładowania).
  - Wyświetlany jest komunikat:
    - „Tekst musi mieć długość od 1000 do 10000 znaków” z dynamicznym licznikiem.
- **Typy**:
  - `GeneratorInputPanelProps`:
    - `value: string`,
    - `charCount: number`,
    - `minLength: number` (1000),
    - `maxLength: number` (10000),
    - `isValid: boolean`,
    - `isGenerating: boolean`,
    - `onChange(value: string): void`,
    - `onGenerate(): void`.


### 4.4. `GeneratorProposalsPanel`

- **Opis**  
  Panel wyświetlający do trzech propozycji fiszek (1–3, ale w MVP zawsze 3 przy sukcesie) oraz zarządzający ich stanem (edycja, wybór kategorii, akcje).
- **Główne elementy**:
  - Lista `ProposalCard` (3 karty),
  - (opcjonalnie) nagłówek „Propozycje AI”.
- **Obsługiwane interakcje**:
  - edycja pól front/back w kartach,
  - wybór kategorii,
  - akceptacja/odrzucenie propozycji.
- **Walidacja**:
  - Nie pozwala na wywołanie `onAccept` jeśli:
    - `front.trim().length` nie jest w zakresie `1–200`,
    - `back.trim().length` nie jest w zakresie `1–500`,
    - nie wybrano `category_id`.
  - Może:
    - zablokować przycisk „Akceptuj”,
    - podświetlić błędne pola lokalnym komunikatem.
- **Typy**:
  - `ViewProposal` (ViewModel):
    - `id: GenerationProposalId`,
    - `index: number`,
    - `front: string`,
    - `back: string`,
    - `categoryId: CategoryId | null`,
    - `isSaving: boolean`,
    - `isRejected: boolean` (lub odfiltrowanie z listy),
    - ewentualnie `errors?: { front?: string; back?: string; category_id?: string }`.
  - `GeneratorProposalsPanelProps`:
    - `proposals: ViewProposal[]`,
    - `categories: CategoryDTO[]`,
    - `isLoading: boolean` (np. ładowanie tuż po `generate`),
    - `onChangeProposal(id, patch)` – aktualizacja propozycji,
    - `onAccept(id)` – próba akceptacji,
    - `onReject(id)` – oznaczenie jako odrzuconej/usunięcie z listy.


### 4.5. `ProposalCard`

- **Opis**  
  Karta prezentująca pojedynczą propozycję fiszki, z polami edycji i akcjami.
- **Główne elementy**:
  - pole `front` (input/textarea jednolinijkowy lub dwuliniowy) z licznikiem znaków,
  - pole `back` (textarea) z licznikiem znaków,
  - dropdown `category_id` (lista nazw kategorii),
  - przyciski „Akceptuj” (primary) i „Odrzuć” (secondary),
  - ikonka/spinner w przycisku „Akceptuj” w trakcie zapisu.
- **Obsługiwane interakcje**:
  - `onChangeFront(value: string)`,
  - `onChangeBack(value: string)`,
  - `onChangeCategory(categoryId: CategoryId)`,
  - `onAccept()`,
  - `onReject()`.
- **Walidacja**:
  - liczniki znaków:
    - `front`: 0–200,
    - `back`: 0–500,
  - jeśli przekroczony limit, pole oznaczone błędem i przycisk „Akceptuj” disabled,
  - jeśli `categoryId` jest null, wyświetlany komunikat „Wybierz kategorię” i disabled przycisk.
- **Typy**:
  - `ProposalCardProps`:
    - `proposal: ViewProposal`,
    - `categories: CategoryDTO[]`,
    - `onChange(proposalId: GenerationProposalId, patch: Partial<ViewProposal>): void`,
    - `onAccept(proposalId: GenerationProposalId): void`,
    - `onReject(proposalId: GenerationProposalId): void`.


### 4.6. `GeneratorSidebar`

- **Opis**  
  Statyczno-pomocniczy panel boczny z informacjami i prostymi tipami dla użytkownika.
- **Główne elementy**:
  - sekcja „Jak wybrać dobry fragment tekstu?”,
  - sekcja „Limity i zasady” (1000–10000 znaków inputu, front ≤ 200, back ≤ 500),
  - (opcjonalnie) mini-log „Ostatnie generacje” (tylko w pamięci UI).
- **Interakcje**  
  Brak logiki; może zawierać linki do dokumentacji/pomocy w przyszłości.
- **Walidacja**  
  Brak.
- **Typy**:
  - `GeneratorSidebarProps` – obecnie może nie wymagać żadnych propsów lub opcjonalnie:
    - `lastErrorMessage?: string`,
    - `lastSuccessAt?: Date`.


## 5. Typy

### 5.1. DTO z warstwy backendu (z `src/types.ts`)

Do implementacji widoku generatora używamy istniejących typów:

- **AI generator**:
  - `GenerateFlashcardsCommand`:
    - `input: string`.
  - `GenerationProposalDTO`:
    - `id: GenerationProposalEntity['id']`,
    - `index: GenerationProposalEntity['index']`,
    - `front: GenerationProposalEntity['front']`,
    - `back: GenerationProposalEntity['back']`.
  - `GenerateFlashcardsResponseDTO`:
    - `generation_id: GenerationId`,
    - `proposals: GenerationProposalDTO[]`.
  - `AcceptFlashcardProposalCommand`:
    - `generation_id: GenerationId`,
    - `proposal_id: GenerationProposalId`,
    - `category_id: FlashcardEntity['category_id']`,
    - `front: FlashcardEntity['front']`,
    - `back: FlashcardEntity['back']`.
  - `AcceptFlashcardProposalResponseDTO`:
    - `flashcard: FlashcardDTO`.

- **Kategorie**:
  - `CategoryDTO = Omit<CategoryEntity, "user_id">`,
  - `ListCategoriesResponseDTO`:
    - `items: CategoryDTO[]`,
    - `limit: number`,
    - `offset: number`,
    - `total: number | null`.


### 5.2. ViewModel-e dla widoku generatora

- **`GeneratorInputViewModel`**:
  - `rawInput: string` – zawartość textarea,
  - `trimmedLength: number` – długość po `trim`,
  - `isValidLength: boolean` – czy `trimmedLength` mieści się w `[1000, 10000]`,
  - `isGenerating: boolean` – czy trwa request `generate`.

- **`ProposalViewModel` (ViewProposal)**:
  - `id: GenerationProposalId`,
  - `index: number`,
  - `front: string`,
  - `back: string`,
  - `categoryId: CategoryId | null`,
  - `isSaving: boolean` – stan podczas żądania `accept`,
  - `isRejected: boolean` – czy propozycja została odrzucona (może być użyte do filtrowania),
  - `errors: { front?: string; back?: string; category_id?: string }` – lokalne błędy walidacji.

- **`GeneratorViewState`**:
  - `input: GeneratorInputViewModel`,
  - `generationId: GenerationId | null`,
  - `proposals: ProposalViewModel[]`,
  - `categories: CategoryDTO[]`,
  - `isCategoriesLoading: boolean`,
  - `error: string | null` (opcjonalnie do debug/logów, główny kanał to toasty).


## 6. Zarządzanie stanem

- Stan widoku można obsłużyć lokalnie za pomocą hooków Reacta, przy wsparciu biblioteki do zapytań (np. React Query / TanStack Query) dla:
  - `GET /api/v1/categories` (cache kategorii),
  - `POST /api/v1/flashcards/generate`,
  - `POST /api/v1/flashcards/accept`.

- **Proponowane zmienne stanu** (w komponencie `GeneratorPage`):
  - `const [input, setInput] = useState<GeneratorInputViewModel>(...)`,
  - `const [generationId, setGenerationId] = useState<GenerationId | null>(null)`,
  - `const [proposals, setProposals] = useState<ProposalViewModel[]>([])`,
  - `const [isGenerating, setIsGenerating] = useState(false)`,
  - `const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)`,
  - `const [categories, setCategories] = useState<CategoryDTO[]>([])`.

- **Custom hook (opcjonalnie)**:
  - `useGeneratorView()` – enkapsuluje:
    - logikę walidacji inputu,
    - wywołanie `generate`,
    - mapping DTO → ViewModel,
    - logikę `accept`/`reject`.
  - Eksportuje:
    - `input`, `setInput`,
    - `proposals`, `updateProposal`, `acceptProposal`, `rejectProposal`,
    - `categories`, `isGenerating`, `isCategoriesLoading`.

- **Integracja z toastami i interceptorami**:
  - Błędy z żądań API przechwycone w hooku, mapowane na:
    - `toast.error("...")` dla błędów biznesowych/walidacyjnych,
    - `toast.error("Nie udało się wygenerować fiszek")` dla 5xx/502 (US-012).


## 7. Integracja API

### 7.1. `GET /api/v1/categories`

- **Cel**: załadowanie listy kategorii do dropdownów w kartach propozycji.
- **Żądanie**:
  - metoda: `GET`,
  - query param: `limit` (np. 100), `offset` (0),
  - nagłówek: `Authorization: Bearer <token>`.
- **Odpowiedź**: `ListCategoriesResponseDTO`.
- **Mapowanie**:
  - zapisujemy `response.items` do `categories`,
  - błędy (401, 500) → toast + ewentualne fallback „Brak kategorii” (UI wymaga kategorii, więc w razie błędu generowanie może być blokowane, dopóki kategorie nie zostaną załadowane lub user nie odświeży widoku).


### 7.2. `POST /api/v1/flashcards/generate`

- **Cel**: wysłanie inputu i otrzymanie trzech propozycji.
- **Żądanie**:
  - body typu `GenerateFlashcardsCommand`:
    - `{ input: string }`,
  - nagłówek: `Authorization: Bearer <token>`.
- **Wymagania**:
  - `input.trim().length` w zakresie `[1000, 10000]`, inaczej UI w ogóle nie wysyła requestu.
- **Odpowiedź**: `GenerateFlashcardsResponseDTO`.
  - `generation_id` zapisujemy w stanie,
  - `proposals` mapujemy na `ProposalViewModel` z pustym `categoryId` i `isSaving = false`.
- **Obsługa błędów**:
  - `400 Bad Request` – input poza zakresem lub inny błąd walidacji:
    - UI wyświetla toast z informacją: „Tekst wejściowy musi mieć od 1000 do 10000 znaków”.
  - `401 Unauthorized` – globalny interceptor → redirect do `/auth`.
  - `502 Bad Gateway` / `500` – toast „Nie udało się wygenerować fiszek, spróbuj ponownie” (US-012),
  - Po błędzie `isGenerating` musi wrócić na `false`.


### 7.3. `POST /api/v1/flashcards/accept`

- **Cel**: zapis pojedynczej propozycji jako nowej fiszki.
- **Żądanie**:
  - body typu `AcceptFlashcardProposalCommand`:
    - `generation_id` – z aktualnego stanu,
    - `proposal_id` – z `ViewProposal.id`,
    - `category_id` – z wybranej kategorii,
    - `front` / `back` – z edytowanych pól.
- **Walidacja przed wysyłką**:
  - `front.trim().length` w `[1, 200]`,
  - `back.trim().length` w `[1, 500]`,
  - `category_id` nie jest `null`.
- **Odpowiedź**: `AcceptFlashcardProposalResponseDTO`.
  - UI może:
    - oznaczyć propozycję jako zaakceptowaną (np. `isRejected = true` lub usunąć z listy),
    - wyświetlić toast sukcesu („Fiszka została zapisana”).
- **Obsługa błędów**:
  - `400 Bad Request` – błąd walidacji:
    - pokazanie toastu z ogólną informacją,
    - ewentualne zmapowanie `details` na konkretne pola (jeśli backend je zwraca).
  - `404 Not Found` – brak generacji/propozycji:
    - toast „Ta propozycja nie jest już dostępna, odśwież widok”.
  - `409 Conflict` – propozycja już zaakceptowana:
    - toast „Ta propozycja została już zaakceptowana”.
  - `401 Unauthorized` – przechwytywane globalnie.
  - `500` – toast „Nie udało się zapisać fiszki, spróbuj ponownie”.


## 8. Interakcje użytkownika

Najważniejsze interakcje i oczekiwane rezultaty:

1. **Wklejenie tekstu**:
   - użytkownik wkleja tekst do textarea,
   - licznik znaków się aktualizuje,
   - UI natychmiast pokazuje, czy spełnione są limity (kolor, komunikat).

2. **Kliknięcie „Generuj fiszki”**:
   - jeśli input jest zbyt krótki/długi → przycisk disabled; albo po kliknięciu pokazuje komunikat walidacyjny,
   - jeśli input jest poprawny → wysyła request, wyświetla spinner i blokuje przycisk,
   - po sukcesie:
     - powstaje panel z 3 kartami,
     - input może pozostać w polu (PRD nie wymaga jego czyszczenia),
   - po błędzie:
     - toast z komunikatem,
     - przycisk odblokowany.

3. **Edycja propozycji**:
   - użytkownik może dowolnie edytować `front`/`back`,
   - liczniki znaków aktualizują się na bieżąco,
   - jeśli przekracza limit – pole jest oznaczone błędem, przycisk „Akceptuj” disabled.

4. **Wybór kategorii**:
   - użytkownik wybiera kategorię z dropdownu,
   - jeśli brak kategorii (np. request się nie udał) → dropdown może pokazywać komunikat lub w ogóle blokować akceptację z odpowiednim komunikatem.

5. **Akceptacja propozycji**:
   - kliknięcie „Akceptuj”:
     - jeśli lokalna walidacja jest spełniona → wysyła `POST /accept`, pokazuje spinner tylko na tej karcie,
     - po sukcesie:
       - toast sukcesu,
       - propozycja znika lub jest oznaczona jako „zaakceptowana” (np. wyszarzona),
     - po błędzie:
       - toast błędu,
       - `isSaving` wraca na `false`.

6. **Odrzucenie propozycji**:
   - kliknięcie „Odrzuć” natychmiast ukrywa kartę lub oznacza ją jako odrzuconą,
   - brak wywołania API (zgodnie z PRD – odrzucenie nic nie zapisuje).


## 9. Warunki i walidacja

Walidacja po stronie UI (zgodna z PRD i API):

- **Input (tekst źródłowy)**:
  - `trimmedLength < 1000` → błąd „Tekst musi mieć co najmniej 1000 znaków”,
  - `trimmedLength > 10000` → błąd „Tekst nie może przekraczać 10000 znaków”,
  - przycisk „Generuj” jest disabled, jeśli warunki nie są spełnione.

- **Propozycja (front/back)**:
  - `front.trim().length === 0` → błąd „Front nie może być pusty”,
  - `front.trim().length > 200` → błąd i blokada „Akceptuj”,
  - `back.trim().length === 0` → błąd „Back nie może być pusty”,
  - `back.trim().length > 500` → błąd i blokada „Akceptuj”.

- **Kategoria**:
  - `categoryId === null` → błąd „Wybierz kategorię”,
  - jeśli lista kategorii jest pusta lub nie udała się do pobrania → warto wyświetlić komunikat globalny („Nie udało się pobrać kategorii”) i ewentualnie CTA do przejścia na `/app/categories`.

- Walidacja jest wykonywana:
  - „na żywo” (przy wpisywaniu) – do sterowania UI,
  - jeszcze raz przy kliknięciu „Akceptuj” – aby nie wysyłać niepoprawnego payloadu.


## 10. Obsługa błędów

Potencjalne scenariusze błędów i sposób obsługi:

1. **Błędy sieciowe / 5xx / 502 podczas `generate`**:
   - pokazanie czerwonego toastu (np. „Nie udało się wygenerować fiszek. Spróbuj ponownie.”),
   - `isGenerating` ustawione na `false`,
   - propozycje z poprzedniej sesji (jeśli istnieją) pozostają widoczne.

2. **`400 Bad Request` przy `generate`**:
   - mapowanie na komunikat typu:
     - „Tekst wejściowy musi mieć długość od 1000 do 10000 znaków”,
   - nie wyświetlamy szczegółów technicznych (np. kodów błędów DB).

3. **`401 Unauthorized`**:
   - przechwytywane globalnie (interceptor),
   - natychmiastowe przekierowanie do `/auth` i wyczyszczenie stanu.

4. **`400/404/409/500` przy `accept`**:
   - 400: lokalny toast „Nie udało się zapisać fiszki – sprawdź treść propozycji”,
   - 404: „Propozycja nie istnieje lub wygasła – odśwież widok”,
   - 409: „Ta propozycja została już wcześniej zaakceptowana”,
   - 500: „Nie udało się zapisać fiszki – spróbuj ponownie”.

5. **Błąd ładowania kategorii**:
   - toast „Nie udało się załadować kategorii”,
   - rozważenie tymczasowego zablokowania przycisków „Akceptuj” do czasu udanego załadowania kategorii.

6. **Nieoczekiwane wyjątki w UI**:
   - w miarę możliwości logowanie do konsoli (tylko env dev),
   - ogólny toast „Wystąpił nieoczekiwany błąd”.


## 11. Kroki implementacji

1. **Przygotowanie tras i layoutu**  
   - Upewnij się, że istnieje layout `/app/*` z topbarem i obsługą autoryzacji.  
   - Dodaj trasę `/app/generator` renderującą komponent `GeneratorPage`.

2. **Definicja typów i ViewModeli po stronie frontendu**  
   - Zaimportuj istniejące typy z `src/types.ts`: `GenerateFlashcardsCommand`, `GenerateFlashcardsResponseDTO`, `AcceptFlashcardProposalCommand`, `AcceptFlashcardProposalResponseDTO`, `CategoryDTO`.  
   - Zdefiniuj lokalne ViewModele (`GeneratorInputViewModel`, `ProposalViewModel`, `GeneratorViewState`) w dedykowanym pliku (np. `generator.types.ts`) lub w module widoku.

3. **Implementacja serwisu API dla generatora**  
   - Stwórz plik serwisu frontowego (np. `src/lib/http/generatorApi.ts` lub dodaj funkcje do istniejącego klienta HTTP):
     - `generateFlashcards(command: GenerateFlashcardsCommand): Promise<GenerateFlashcardsResponseDTO>`,
     - `acceptFlashcardProposal(command: AcceptFlashcardProposalCommand): Promise<AcceptFlashcardProposalResponseDTO>`,
     - `listCategories(query: ListCategoriesQueryDTO): Promise<ListCategoriesResponseDTO>`.

4. **Implementacja hooka `useGeneratorView` (opcjonalne, ale zalecane)**  
   - Hook zarządza stanem inputu, generacji, propozycji i kategorii.  
   - Implementuje funkcje:
     - `setInput(rawInput: string)`,
     - `generate(): Promise<void>`,
     - `updateProposal(id, patch)`,
     - `acceptProposal(id)`,
     - `rejectProposal(id)`.  
   - Zapewnia walidację inputu i propozycji oraz integrację z toastami.

5. **Implementacja komponentu `GeneratorPage`**  
   - Użyj `useGeneratorView()` lub lokalnego stanu.  
   - Renderuj `GeneratorLayout` z odpowiednimi propsami.  
   - Podłącz ogólny kontekst toastów i error handlingu.

6. **Implementacja `GeneratorInputPanel` i `GeneratorTextarea`**  
   - Zaimplementuj textarea z licznikami znaków (`value.length` i `trimmedLength`).  
   - Podłącz walidację i stan disabled dla przycisku „Generuj”.  
   - Dodaj prosty komunikat walidacyjny pod polem.

7. **Implementacja `GeneratorProposalsPanel` i `ProposalCard`**  
   - Zaimplementuj utworzenie 3 kart na podstawie `proposals`.  
   - W `ProposalCard` dodaj logikę liczników znaków, walidację oraz stan disabled przycisku „Akceptuj”.  
   - Obsłuż komunikaty błędów inline (np. pod polami front/back).

8. **Implementacja `GeneratorSidebar`**  
   - Dodaj sekcje z tekstowymi wskazówkami i limitami.  
   - Ewentualnie przewidź miejsce na prosty log ostatnich błędów/sukcesów.

9. **Integracja z kategoriami**  
   - Przy montowaniu `GeneratorPage` załaduj kategorie (`GET /categories`) i zapisz w stanie.  
   - Udostępnij listę kategorii do dropdownów w `ProposalCard`.  
   - Dodaj obsługę błędów ładowania kategorii (toast).

10. **Integracja z API `generate` i `accept`**  
    - Podłącz `GeneratorInputPanel.onGenerate` do wywołania `generateFlashcards`.  
    - Podłącz `ProposalCard.onAccept` do wywołania `acceptFlashcardProposal`.  
    - Ustaw odpowiednio stany `isGenerating` / `isSaving` i obsłuż sukces/błędy (toasty).

11. **Obsługa błędów i scenariuszy brzegowych**  
    - Przetestuj przypadki:
      - input zbyt krótki / zbyt długi,
      - brak kategorii,
      - błędy 4xx/5xx z backendu, w tym `409` podczas `accept`.  
    - Upewnij się, że UI zawsze wraca do spójnego stanu (przyciski odblokowane, spinnery ukryte).

12. **Testy manualne scenariuszy z US-008 i US-009**  
    - Scenariusz podstawowy: poprawne generowanie + edycja i akceptacja 1–3 propozycji.  
    - Scenariusz błędny: input poza limitem, błąd generowania, błąd zapisu propozycji.  
    - Scenariusz mieszany: część propozycji zaakceptowana, część odrzucona.

13. **Refinement UX i a11y**  
    - Sprawdź focus states, obsługę klawiatury, czytelność komunikatów.  
    - Upewnij się, że widok dobrze wygląda w typowej szerokości desktopowej i skaluje się przy lekkim zwężeniu okna.


