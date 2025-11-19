## Plan testów projektu Fiszki AI

## 1. Wprowadzenie i cele testowania

Projekt **Fiszki AI** to aplikacja webowa umożliwiająca generowanie, akceptację i zarządzanie fiszkami edukacyjnymi z wykorzystaniem AI (Openrouter.ai) oraz backendu opartego na Supabase (PostgreSQL + auth). Frontend jest zbudowany w **Astro 5** z użyciem komponentów **React 19**, **TypeScript 5**, **Tailwind 4** i komponentów **shadcn/ui**.

**Cele testowania:**

- **Zapewnienie poprawności funkcjonalnej** kluczowych obszarów:
  - rejestracji, logowania i odzyskiwania hasła,
  - generowania propozycji fiszek przez AI,
  - akceptacji propozycji i zapisu fiszek do bazy,
  - zarządzania kategoriami i fiszkami.
- **Zweryfikowanie integralności przepływów end‑to‑end**: od interakcji użytkownika w UI do zapisów w bazie.
- **Weryfikacja jakości UX i dostępności** interakcyjnych ekranów (logowanie, generator fiszek).
- **Ograniczenie ryzyka związanego z integracjami zewnętrznymi** (Supabase, Openrouter) oraz politykami bezpieczeństwa (RLS).
- **Ustanowienie podstaw pod regresję automatyczną** (unit, integracja, E2E) dla przyszłych zmian.

---

## 2. Zakres testów

### 2.1 W zakresie

- **Frontend (Astro + React)**:
  - Strony `index.astro`, `auth/login.astro`, `auth/register.astro`, `auth/forgot-password.astro`, `app/generator.astro`.
  - Komponenty React:
    - Moduł **auth**: `LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `AuthLayout.tsx`.
    - Moduł **generator**: `GeneratorPage.tsx`, `GeneratorLayout.tsx`, `GeneratorInputPanel.tsx`, `GeneratorProposalsPanel.tsx`, `GeneratorSidebar.tsx`, `GeneratorToastStack.tsx`, `ProposalCard.tsx`, hook `useGeneratorView.ts`.
- **API / backend (Astro server endpoints + Supabase)**:
  - Auth: `/src/pages/api/auth/login.ts`, `/src/pages/api/auth/register.ts`.
  - Flashcards:
    - `/src/pages/api/v1/flashcards/generate.ts`,
    - `/src/pages/api/v1/flashcards/accept.ts`,
    - `/src/pages/api/v1/flashcards/index.ts`.
  - Kategorie: `/src/pages/api/v1/categories/index.ts`.
  - Warstwa usług: `flashcardGeneratorService.ts`, `flashcardAcceptService.ts`, `flashcardService.ts`, `categoryService.ts`, `ai/openrouterClient.ts`, `openrouter.service.ts`.
  - Walidacje: `validation/auth.ts`, `validation/flashcards.ts`, `validation/categories.ts`.
  - Supabase: `supabase.client.ts`, `supabase.server.ts`, `database.types.ts`.
- **Middleware i infrastruktura**:
  - `src/middleware/index.ts` – podłączenie Supabase do `context.locals`.
  - Obsługa błędów i odpowiedzi HTTP: `lib/http.ts`, `lib/utils.ts`.

### 2.2 Poza zakresem (na tym etapie)

- Testy instalatora/CI/CD (Github Actions) – tylko sanity check uruchomienia testów.
- Testy migracji baz danych historycznych (poza aktualną migracją w repo).
- Testy obciążeniowe w skali produkcyjnej (testy wydajności będą ukierunkowane, ale nie pełne testy load/stress).

---

## 3. Typy testów do przeprowadzenia

### 3.1 Testy statyczne

- **Analiza statyczna kodu**:
  - ESLint dla plików **TypeScript/React/Astro**.
  - Weryfikacja typów TypeScript (`tsc`) – brak błędów typowania.
- **Przegląd kodu (code review)**:
  - Skupione na bezpieczeństwie (obsługa haseł, tokenów, danych wrażliwych).
  - Spójność warstwy walidacji (Zod) i modeli typów (DTO w `src/types.ts`).

### 3.2 Testy jednostkowe (unit)

- **Cel**: walidacja logiki domenowej i funkcji pomocniczych bez integracji z zewnętrznymi serwisami.
- Obszary:
  - Schematy Zod: `auth`, `flashcards`, `categories`.
  - `flashcardGeneratorService` – poprawne mapowanie komendy wejściowej do wywołań AI, obsługa `AiProviderError`.
  - `flashcardAcceptService` – logika biznesowa przy akceptacji fiszki, mapowanie błędów domenowych na typy `DomainError`.
  - `flashcardService`, `categoryService` – operacje na danych z Supabase, mockowane wywołania.
  - Funkcje pomocnicze w `lib/utils.ts`, `lib/http.ts`.
  - Hooki frontendowe (szczególnie `useGeneratorView.ts`) – za pomocą testów React hooks.

### 3.3 Testy integracyjne

- **Cel**: sprawdzenie współdziałania modułów (API ↔ Supabase, API ↔ AI klient, React ↔ API).
- Przykładowe integracje:
  - Endpoint `/api/v1/flashcards/generate` z:
    - `generateFlashcardsCommandSchema`,
    - `generateFlashcardsFromInput`,
    - supabase client w `locals.supabase`,
    - Openrouter (mockowane).
  - Endpoint `/api/v1/flashcards/accept` z:
    - `acceptFlashcardProposalSchema`,
    - `acceptFlashcardProposal`,
    - Supabase (w tym RLS).
  - Moduł `LoginForm.tsx` ↔ `/api/auth/login`: poprawna interpretacja struktury odpowiedzi i błędów.
  - `GeneratorPage.tsx` ↔ `react/generator/api.ts` ↔ `/api/v1/flashcards/*` – pełny przepływ front‑backend (z mockiem sieci).

### 3.4 Testy end‑to‑end (E2E)

- **Cel**: weryfikacja pełnych scenariuszy użytkownika w przeglądarce.
- Zakres:
  - Rejestracja, logowanie, wylogowanie.
  - Generowanie fiszek z tekstu wejściowego.
  - Akceptacja propozycji i zapis do biblioteki.
  - Nawigacja po głównych ekranach (`/`, `/auth/*`, `/app/generator`, docelowo `/app/flashcards`, `/app/categories`).
- Narzędzia: Playwright lub Cypress.

### 3.5 Testy wydajnościowe

- **Cel**: sprawdzenie, czy generowanie i akceptacja fiszek działają płynnie przy typowym obciążeniu.
- Zakres:
  - API `/api/v1/flashcards/generate` i `/api/v1/flashcards/accept` pod umiarkowanym obciążeniem (np. k6).
  - Czas odpowiedzi i stabilność przy łączeniu się z AI (z mockiem i ewentualnie z realnym API w trybie ograniczonym).

### 3.6 Testy bezpieczeństwa

- **Cel**: wychwycenie podatności na poziomie API i autentykacji.
- Zakres:
  - Weryfikacja poprawnego stosowania RLS w Supabase (tylko dane właściciela).
  - Próby nieautoryzowanego dostępu do fiszek/kategorii.
  - Sprawdzenie, że dane wrażliwe (hasła) nie są zwracane w odpowiedziach API.
  - Podstawowe testy OWASP (XSS, CSRF, brak wstrzykiwania SQL – Supabase parametryzowane).

### 3.7 Testy użyteczności i dostępności

- **Cel**: upewnienie się, że kluczowe przepływy są intuicyjne i dostępne.
- Zakres:
  - Formularze auth (etykiety, `aria-*`, komunikaty błędów).
  - Ekran generatora:
    - ARIA (`role="main"`, `aria-current`, czytelne komunikaty błędów),
    - obsługa klawiaturą,
    - czytelność interfejsu (kontrasty).

### 3.8 Testy regresyjne

- **Cel**: po wprowadzeniu zmian w logice generowania/akceptacji fiszek, auth czy RLS – odpalenie pełnej puli testów automatycznych (unit + integracja + kluczowe E2E).

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1 Autentykacja (login, rejestracja, reset hasła)

#### 4.1.1 Logowanie – scenariusze pozytywne

- **Scenariusz L1 – Poprawne logowanie:**
  - Użytkownik otwiera `/auth/login`.
  - Wpisuje poprawny email i hasło istniejącego konta.
  - Oczekiwany rezultat:
    - Żądanie `POST /api/auth/login` z poprawnym JSON.
    - Status 200.
    - Przekierowanie do `/app/generator`.
    - Brak komunikatów błędów, poprawne ustawienie cookies/sesji (jeśli stosowane).

#### 4.1.2 Logowanie – scenariusze negatywne

- **L2 – Puste pola:**
  - Brak emaila i/lub hasła.
  - Oczekiwane: walidacja po stronie klienta (`LoginForm`), czerwone pola, komunikat „Podaj adres e-mail.” / „Hasło nie może być puste.”.
- **L3 – Nieprawidłowy format emaila:**
  - Email bez `@` lub domeny.
  - Oczekiwane: komunikat walidacji po stronie klienta, brak wysyłki do API.
- **L4 – Błędne dane logowania:**
  - API zwraca błąd 401 z komunikatem i ewentualnym `details.field`.
  - `LoginForm` przypisuje komunikat do odpowiedniego pola i wyświetla status główny.
- **L5 – Błąd serwera / brak połączenia:**
  - API zwraca 500 lub fetch rzuca wyjątek (np. brak sieci).
  - Oczekiwane: komunikat „Nie udało się połączyć z serwerem…”.

#### 4.1.3 Rejestracja / reset hasła (analogicznie)

- Poprawne tworzenie konta (unikalny email), walidacja hasła.
- Próba rejestracji z istniejącym emailem (błąd conflict).
- Żądanie resetu hasła – poprawny flow i komunikaty dla użytkownika.

### 4.2 Generator fiszek AI

#### 4.2.1 Generowanie – scenariusze pozytywne

- **G1 – Minimalny poprawny input:**
  - Użytkownik wprowadza tekst o długości \\( \\geq 1000 \\) i \\( \\leq 10000 \\) znaków.
  - Naciska przycisk „Generuj”.
  - Oczekiwane:
    - Walidacja długości przechodzi (`isValidLength`).
    - Żądanie `POST /api/v1/flashcards/generate` z poprawnym JSON zgodnym ze `generateFlashcardsCommandSchema`.
    - Odpowiedź 200 z listą propozycji i identyfikatorem generacji.
    - UI pokazuje karty propozycji (`GeneratorProposalsPanel`).

- **G2 – Kolejne generowanie po edycji tekstu:**
  - Zmiana tekstu i ponowne kliknięcie „Generuj”.
  - Oczekiwane: poprzednie propozycje są zastępowane nowymi, stany ładowania są spójne.

#### 4.2.2 Generowanie – scenariusze negatywne

- **G3 – Za krótki input (<1000 znaków):**
  - Oczekiwane: walidacja po stronie klienta, brak requestu do API, komunikat błędu.
- **G4 – Zbyt długi input (>10000 znaków):**
  - Oczekiwane: blokada wysyłki, jasny komunikat.
- **G5 – Niepoprawny JSON / walidacja po stronie backendu:**
  - Wymuszenie niezgodnego payload (np. przez test integracyjny).
  - API zwraca 400 z `field` i `issues`.
  - Sprawdzenie poprawnego logowania i formatowania błędu (HTTP helper).
- **G6 – Błąd AI (AiProviderError):**
  - W testach integracyjnych/mockach wywołanie AI rzuca `AiProviderError`.
  - Oczekiwane: odpowiedź 502 z komunikatem „AI generation failed…”.

### 4.3 Akceptacja propozycji fiszek

#### 4.3.1 Akceptacja – scenariusz pozytywny

- **A1 – Poprawna akceptacja propozycji:**
  - Użytkownik wybiera jedną z propozycji z panelu.
  - Uzupełnia/wybiera kategorię (jeśli wymagane).
  - UI wysyła żądanie `POST /api/v1/flashcards/accept` zgodne z `acceptFlashcardProposalSchema`.
  - Oczekiwane:
    - Status 201.
    - Zwrócenie zaakceptowanej fiszki (front/back/category/generation_id/proposal_id).
    - Zaktualizowanie stanu UI (np. oznaczenie propozycji jako zaakceptowanej, toast sukcesu).
    - Rekord pojawia się w bazie w tabeli `flashcards` (test integracyjny/E2E).

#### 4.3.2 Akceptacja – scenariusze błędne

- **A2 – Brak wymaganych pól w żądaniu:**
  - API zwraca 400, `firstIssue` z odpowiednim `path`.
  - Sprawdzenie mapowania błędu na JSON odpowiedzi.
- **A3 – Nieistniejący `generation_id` lub `proposal_id`:**
  - `acceptFlashcardProposal` rzuca `DomainError` typu `NotFound`.
  - API zwraca 404 z komunikatem i `details`.
- **A4 – Konflikt (np. podwójna akceptacja):**
  - `DomainError` typu `Conflict`.
  - API zwraca 409.
- **A5 – Brak autoryzacji (po przywróceniu pełnego auth):**
  - `DomainError` typu `Unauthorized`.
  - API zwraca 401.
- **A6 – Niespodziewany błąd domeny lub runtime:**
  - `DomainError` typu `Unknown` lub wyjątek inny niż `DomainError`.
  - API zwraca 500 z generycznym komunikatem, log zapisany w konsoli.

### 4.4 Zarządzanie fiszkami i kategoriami

- **C1 – Pobieranie listy kategorii (`/api/v1/categories`):**
  - Scenariusz pozytywny: poprawna lista kategorii dla użytkownika.
  - Scenariusze negatywne: brak danych, błąd bazy, brak autoryzacji.
- **C2 – Pobieranie listy fiszek (`/api/v1/flashcards`):**
  - Weryfikacja, że zwracane są tylko fiszki zalogowanego użytkownika (RLS).
- **C3 – Tworzenie/edycja/usuwanie kategorii (jeśli zaimplementowane):**
  - Walidacja danych, reakcje na błędy konfliktów (np. duplikaty nazw).

### 4.5 Nawigacja i layout (Astro + React)

- **N1 – Nawigacja w topbarze generatora (`NAV_LINKS`):**
  - Linki prowadzą do `/app/generator`, `/app/flashcards`, `/app/learn`, `/app/categories`.
  - `aria-current="page"` prawidłowo ustawione dla aktywnej strony.
- **N2 – Layout responsywny:**
  - Widoki na desktop/tablet/mobile dla głównych stron.
  - Brak łamania layoutu przy typowych rozdzielczościach.

### 4.6 Dostępność i komunikaty błędów

- **D1 – Formularz logowania:**
  - `label` powiązane z inputami przez `htmlFor` + `useId`.
  - `role="alert"` dla komunikatów błędów.
- **D2 – Komunikaty generatora i toastów:**
  - Zrozumiałe treści, brak technicznych komunikatów dla użytkownika („Internal server error” tylko w logach, nie w UI).
  - Sprawdzenie `aria-live` (jeśli zastosowane) i focus management.

---

## 5. Środowisko testowe

### 5.1 Środowisko lokalne

- **Konfiguracja:**
  - System: Windows 10+ (zgodnie z danymi), testy docelowo również na Linux/Mac w CI.
  - Node: wersja z `.nvmrc`.
  - Polecenia:
    - `npm install`
    - `npm run dev` – lokalny serwer Astro.
- **Supabase (dev):**
  - Lokalny projekt Supabase lub instancja w chmurze w trybie developerskim.
  - Zastosowanie migracji z katalogu `supabase/migrations`.
  - Zdefiniowane zmienne środowiskowe `SUPABASE_URL`, `SUPABASE_KEY` w `.env`.

### 5.2 Środowisko testowe/staging

- Oddzielny projekt Supabase z własną bazą danych.
- Osobny klucz Openrouter (np. ograniczony budżetowo).
- Konfiguracja CI do uruchamiania testów (unit/integracja/E2E) na staging buildzie.

### 5.3 Dane testowe

- **Konta użytkowników:**
  - Użytkownik standardowy (dla manualnych i automatycznych testów).
  - Użytkownik bez przypisanych fiszek/kategorii.
- **Dane domenowe:**
  - Zestawy tekstów wejściowych różnej długości (krótkie, poprawne, zbyt długie).
  - Kategorie testowe (np. „Język angielski”, „Historia”, „Biologia”).

---

## 6. Narzędzia do testowania

- **Testy jednostkowe i integracyjne:**
  - **Vitest** lub **Jest** + `@testing-library/react` dla testów komponentów React.
- **Testy E2E:**
  - **Playwright** lub **Cypress** do automatyzacji scenariuszy użytkownika.
- **Analiza statyczna:**
  - **ESLint**, **TypeScript** (`tsc`).
- **Testy API:**
  - **Postman** / **Insomnia** lub **REST Client** w VS Code.
- **Testy wydajności:**
  - **k6** do generowania obciążenia na endpointy AI/flashcards.
- **Testy bezpieczeństwa (podstawowe):**
  - **OWASP ZAP** lub podobne narzędzie do skanowania prostych podatności.
- **Raportowanie i śledzenie błędów:**
  - System zgłaszania błędów (np. Jira, GitHub Issues) – uzgodniony z zespołem.

---

## 7. Harmonogram testów

- **Faza 1 – Przygotowanie (1–2 dni):**
  - Konfiguracja narzędzi testowych (unit/integracja/E2E).
  - Przygotowanie danych testowych (użytkownicy, teksty wejściowe).
- **Faza 2 – Testy jednostkowe i integracyjne (3–5 dni):**
  - Pokrycie walidacji, usług domenowych, helperów HTTP.
  - Pierwsze testy integracyjne API ↔ Supabase ↔ AI (z mockami).
- **Faza 3 – Testy E2E (3–5 dni):**
  - Implementacja scenariuszy dla auth, generatora, akceptacji fiszek.
  - Testy regresyjne po poprawkach.
- **Faza 4 – Testy wydajnościowe i bezpieczeństwa (2–3 dni):**
  - Skoncentrowane testy wydajności endpointów AI i akceptacji.
  - Skanowanie podstawowych podatności.
- **Faza 5 – Stabilizacja i regresja (ciągła):**
  - Po każdej istotnej zmianie – uruchomienie suitów automatycznych.
  - Ocena trendów jakościowych (liczba błędów, czas naprawy).

(Harmonogram do dostosowania do czasu i zasobów zespołu.)

---

## 8. Kryteria akceptacji testów

- **Kryteria funkcjonalne:**
  - Wszystkie scenariusze kluczowe (auth, generowanie fiszek, akceptacja, nawigacja) przechodzą na środowisku testowym bez błędów.
  - Brak błędów typu blocker/krytyczny w backlogu.
- **Kryteria jakości kodu:**
  - 0 błędów typowania w TypeScript.
  - Brak błędów ESLint klasy error (warningi dopuszczalne po uzasadnieniu).
  - Pokrycie testami jednostkowymi dla krytycznych usług (flashcards, auth, categories) na poziomie min. 70%.
- **Kryteria wydajności:**
  - Średni czas odpowiedzi API dla `generate` i `accept` w typowych warunkach < 1s (z mockiem AI) oraz akceptowalny przy realnym AI (do ustalenia).
- **Kryteria bezpieczeństwa:**
  - Brak otwartych krytycznych/lub wysokich podatności w raporcie bezpieczeństwa.
  - Zweryfikowane RLS dla fiszek i kategorii – użytkownik nie ma dostępu do danych innych użytkowników.

---

## 9. Role i odpowiedzialności w procesie testowania

- **QA Engineer (Ty / zespół QA):**
  - Definiuje strategię testów, scenariusze, tworzy i utrzymuje testy automatyczne.
  - Prowadzi testy manualne krytycznych przepływów.
  - Prowadzi raportowanie i śledzenie błędów.
- **Backend Developer:**
  - Zapewnia poprawną obsługę błędów i logowanie w usługach (Supabase, AI, endpointy).
  - Wspiera QA przy debugowaniu problemów backendowych.
- **Frontend Developer:**
  - Dba o poprawną obsługę stanów UI, walidację i komunikaty błędów.
  - Wspiera QA przy naprawie problemów w komponentach React/Astro.
- **DevOps / Infra (jeśli istnieje):**
  - Konfiguruje środowiska testowe/staging i pipeline CI.
  - Integruje uruchamianie testów w CI/CD.
- **Product Owner / Analityk:**
  - Akceptuje scenariusze testowe na podstawie wymagań biznesowych.
  - Uczestniczy w odbiorze funkcjonalności.

---

## 10. Procedury raportowania błędów

- **Zgłaszanie błędów:**
  - Każdy błąd jest rejestrowany w systemie (np. Jira/GitHub Issues) z następującymi polami:
    - **Tytuł** – zwięzły opis problemu.
    - **Opis** – szczegółowe kroki odtworzenia (step-by-step).
    - **Oczekiwany rezultat** vs **rzeczywisty rezultat**.
    - **Środowisko** (dev/test/staging, wersja aplikacji, przeglądarka).
    - **Logi** (fragmenty logów backendu/konsole przeglądarki, zrzuty ekranu).
    - **Priorytet** (blocker, wysoki, średni, niski).
    - **Obszar** (auth, generator, API, UI itp.).
- **Cykl życia błędu:**
  - **New** → **Triaged** (QA/PO) → **In progress** (dev) → **Ready for retest** → **Verified** (QA) → **Closed**.
  - Jeśli błąd nie może zostać naprawiony w aktualnej iteracji – oznaczenie jako **Deferred** z uzasadnieniem.
- **Regresja:**
  - Po zamknięciu błędu – dodanie/aktualizacja testu automatycznego lub scenariusza manualnego.
  - Przy kolejnych release’ach – odpalenie suitów regresyjnych obejmujących naprawione obszary.
- **Raportowanie stanu jakości:**
  - Cotygodniowe (lub per sprint) raporty:
    - Liczba otwartych błędów wg priorytetu.
    - Trend liczby błędów.
    - Pokrycie testami automatycznymi i status pipeline’ów CI.

---

Ten plan testów jest dopasowany do specyfiki projektu **Fiszki AI** (Astro + React + Supabase + Openrouter) i koncentruje się na zapewnieniu jakości kluczowych przepływów: autentykacji, generowania i akceptacji fiszek oraz zarządzania kategoriami, z uwzględnieniem ryzyk związanych z integracjami zewnętrznymi, RLS oraz UX/dostępnością.


