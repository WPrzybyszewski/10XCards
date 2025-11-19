## Moduł uwierzytelniania użytkownika – architektura (US‑001, US‑002, US‑003, US‑013)

Na podstawie wymagań z `prd.md`:

- US‑001 – Rejestracja użytkownika  
- US‑002 – Logowanie użytkownika  
- US‑003 – Wylogowanie użytkownika  
- US‑013 – Bezpieczny dostęp do treści (uwierzytelnianie)  

oraz stacku z `tech-stack.md` (Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui, Supabase Auth).

Aplikacja działa jako Astro SSR na Node (`output: "server"` w `astro.config.mjs`), z Supabase jako backendem (PostgreSQL + Auth). Celem architektury jest dodanie pełnego modułu auth (rejestracja, logowanie, wylogowanie, przygotowany flow odzyskiwania hasła) **bez naruszenia istniejących ścieżek** generatora fiszek, CRUD fiszek i kategorii.

---

## 1. Architektura interfejsu użytkownika

### 1.1. Tryb non‑auth vs auth – zmiany w stronach, komponentach i layoutach

#### 1.1.1. Tryb non‑auth (użytkownik niezalogowany)

- **Dostępne kluczowe widoki:**
  - `GET /` (`src/pages/index.astro`)
    - Rola:
      - Landing / intro produktu (już istnieje).
      - CTA do rejestracji i logowania.
    - Zmiana:
      - Jeżeli użytkownik jest już zalogowany (sprawdzenie w SSR) → redirect do `/app/generator`.
      - Jeżeli niezalogowany → render obecnego wyglądu + sekcja „Zaloguj się / Zarejestruj” (przyciski prowadzące do `/auth/login` i `/auth/register`).
  - `GET /auth/login` – nowa strona logowania.
  - `GET /auth/register` – nowa strona rejestracji.
  - (Opcjonalnie) `GET /auth/forgot-password` – nowa strona odzyskiwania hasła (architektura przygotowana, wdrożenie może być etapem 2).

- **Brak dostępu:**
  - `/app/generator`, `/app/flashcards`, `/app/learn` – widoki wymagające auth.
  - Próba wejścia na nie w trybie non‑auth skutkuje przekierowaniem do `/auth/login` (z zachowaniem spójnego komunikatu).

- **Layout:**
  - `src/layouts/Layout.astro`:
    - W trybie non‑auth:
      - Nawigacja zawiera:
        - Logo / nazwę produktu.
        - Link „Zaloguj” → `/auth/login`.
        - Link „Zarejestruj” → `/auth/register`.
      - Brak linków do generatora, fiszek i nauki.
    - Informacja o stanie auth nie jest pobierana na kliencie – layout opiera się na danych z SSR (user obecny / brak usera z `Astro.locals.supabase`).

#### 1.1.2. Tryb auth (użytkownik zalogowany)

- **Dostępne widoki:**
  - `GET /app/generator` (`src/pages/app/generator.astro`) – generator AI (już istnieje).
  - `GET /app/flashcards` – lista fiszek (istniejący / planowany widok).
  - `GET /app/learn` – tryb nauki.
  - (Opcjonalnie) `GET /app/account` – prosty widok „Moje konto” (np. e‑mail, link do resetu hasła).

- **Zachowanie stron auth:**
  - `GET /auth/login` i `GET /auth/register`:
    - Jeśli użytkownik jest już zalogowany (SSR) → redirect do `/app/generator`.
    - Jeśli nie → render stron z formularzami.

- **Layout:**
  - `Layout.astro` w trybie auth:
    - Nawigacja:
      - Link „Generator” → `/app/generator`.
      - Link „Fiszki” → `/app/flashcards`.
      - Link „Nauka” → `/app/learn`.
      - Przycisk „Wyloguj” → wywołuje `POST /api/auth/logout` (np. formularz `<form method="post">` lub JS na `fetch`).
    - Opcjonalnie pokazuje e‑mail zalogowanego użytkownika.

### 1.2. Podział odpowiedzialności: strony Astro vs komponenty React

#### 1.2.1. Strony Astro (routing, SSR, guardy auth)

Nowe strony:

- `src/pages/auth/login.astro`
  - Odpowiedzialność:
    - Sprawdzenie sesji użytkownika (SSR) na początku pliku:
      - `const { data } = await Astro.locals.supabase.auth.getUser();`
      - Jeśli `data.user` istnieje → redirect 302 do `/app/generator`.
    - Render layoutu z osadzonym komponentem React `LoginForm`.
  - UI:
    - Wywołanie `LoginForm`jako komponentu Reactowego, osadzonego np. w Shadcn `Card` (może być bezpośrednio w `LoginForm`).

- `src/pages/auth/register.astro`
  - Analogicznie do `login.astro`, z komponentem `RegisterForm`.

- (Rozszerzenie istniejących):
  - `src/pages/index.astro`:
    - SSR: jeśli `user` istnieje → redirect do `/app/generator`.
    - W przeciwnym razie render aktualnej strony + CTA do `/auth/login` i `/auth/register`.
  - `src/pages/app/generator.astro`, `src/pages/app/flashcards.astro`, `src/pages/app/learn.astro`:
    - Na początku:
      - SSR `const { data } = await Astro.locals.supabase.auth.getUser();`
      - Jeśli brak `data.user` → redirect 302 do `/auth/login`.
    - Reszta logiki (generator, lista fiszek, nauka) pozostaje bez zmian → nie naruszamy istniejącego działania.

Opcjonalnie:

- `src/pages/auth/forgot-password.astro`
  - SSR:
    - Jeśli user zalogowany → redirect do `/app/generator` (nie ma sensu resetować hasła będąc zalogowanym).
    - W przeciwnym razie render `ForgotPasswordForm` (React).

#### 1.2.2. Komponenty React (formularze + integracja z API)

Struktura:

- `src/react/auth/AuthLayout.tsx`
  - Prezentacyjny wrapper dla formularzy auth wykorzystujący Shadcn/ui:
    - Użycie komponentów: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Button`, `Input`, `Form`, `Alert`.
  - Odpowiedzialność:
    - Spójny wygląd formularzy (nagłówek, opis, stopka z linkami).
    - Nie zawiera logiki auth – tylko layout.

- `src/react/auth/LoginForm.tsx`
  - Pola:
    - `email: string`
    - `password: string`
    - Opcjonalnie: „Zapamiętaj mnie” (steruje długością sesji, w Supabase można obsłużyć przez odpowiednie ustawienia).
  - Odpowiedzialność:
    - Stan formularza (React hooks).
    - Walidacja po stronie klienta:
      - E‑mail – format (`/^\S+@\S+\.\S+$/` lub walidator).
      - Hasło – niepuste.
    - Wywołanie backendu:
      - `POST /api/auth/login` (JSON body).
      - Obsługa statusów `200`, `400`, `401`, `500`.
    - UX:
      - Button „Zaloguj” z disabled podczas ładowania.
      - Wyświetlanie błędów:
        - Walidacja formularza (inline).
        - Błędy z backendu (np. `INVALID_CREDENTIALS` → „Nieprawidłowy e‑mail lub hasło”).
      - Po sukcesie:
        - `window.location.assign('/app/generator');` (przeładowanie SSR z aktualną sesją).

- `src/react/auth/RegisterForm.tsx`
  - Pola:
    - `email`, `password`, `confirmPassword`.
  - Odpowiedzialność:
    - Stan + walidacja:
      - `email` – format.
      - `password` – min. długość (np. 8), podstawowa złożoność.
      - `confirmPassword` – zgodne z `password`.
    - Wywołanie `POST /api/auth/register`.
    - Obsługa typowych błędów:
      - `EMAIL_ALREADY_REGISTERED` → „Konto z tym adresem e‑mail już istnieje”.
      - Walidacja backend (mapowana na pola).
    - Po sukcesie:
      - Opcja A (rekomendowana dla MVP): auto‑login – backend tworzy sesję, frontend przekierowuje na `/app/generator`.
      - Opcja B: przekierowanie na `/auth/login` z komunikatem „Konto utworzone, możesz się zalogować”.

- (Opcjonalnie w 1. iteracji lub później) `src/react/auth/ForgotPasswordForm.tsx`
  - Pole: `email`.
  - Odpowiedzialność:
    - Walidacja formatu e‑mail.
    - Wywołanie `POST /api/auth/forgot-password`.
    - UX:
      - Po sukcesie: neutralny komunikat „Jeśli konto istnieje, wysłaliśmy link resetujący hasło”.
      - Nie ujawniamy, czy e‑mail istnieje w systemie (bezpieczeństwo).

### 1.3. Walidacja i komunikaty błędów (frontend)

- **Rejestracja:**
  - Błędy walidacji pól (inline):
    - `email` – „Podaj poprawny adres e‑mail”.
    - `password` – „Hasło musi mieć co najmniej 8 znaków”.
    - `confirmPassword` – „Hasła muszą być takie same”.
  - Błędy backend:
    - `EMAIL_ALREADY_REGISTERED` – przyjazny komunikat na górze formularza.
    - `VALIDATION_ERROR` – mapowane na konkretne pola (np. za pomocą struktury `{ field, message }`).

- **Logowanie:**
  - Błędy walidacji:
    - Brak e‑maila / hasła.
  - Błędy backend:
    - `INVALID_CREDENTIALS` – „Nieprawidłowy e‑mail lub hasło”.
    - Inne `400/500` – „Wystąpił błąd podczas logowania. Spróbuj ponownie później.”

- **Odzyskiwanie hasła (opcjonalne):**
  - Błędy walidacji:
    - Niepoprawny e‑mail.
  - Błędy backend:
    - Zawsze ten sam komunikat sukcesu, niezależnie od tego, czy konto istnieje – „Jeśli konto istnieje, wysłaliśmy link resetujący hasło”.

### 1.4. Najważniejsze scenariusze UX

1. **Nowy użytkownik zakłada konto i trafia do generatora (US‑001):**
   - `/` → „Zarejestruj się” → `/auth/register`.
   - Uzupełnia formularz, wysyła.
   - Po sukcesie:
     - Auto‑login + redirect `/app/generator` (lub redirect do loginu, jeśli taki wariant wybierzemy).

2. **Istniejący użytkownik loguje się i widzi główny ekran (US‑002):**
   - `/` → „Zaloguj się” → `/auth/login`.
   - Wpisuje dane, wysyła.
   - Po sukcesie → `/app/generator`; sesja utrzymywana (Supabase).

3. **Próba dostępu do zasobów bez logowania (US‑013):**
   - Niezalogowany użytkownik wchodzi na `/app/generator`.
   - SSR sprawdza `user` z Supabase → brak.
   - Redirect 302 do `/auth/login` + informacja „Zaloguj się, aby uzyskać dostęp do generatora”.

4. **Wylogowanie:**
   - Zalogowany użytkownik klika „Wyloguj”.
   - `POST /api/auth/logout`.
   - Backend czyści sesję (Supabase), frontend przekierowuje do `/auth/login` lub `/`.
   - Po odświeżeniu nie ma już dostępu do `/app/*`.

5. **(Opcjonalne) Użytkownik zapomniał hasła:**
   - Na `/auth/login` klika link „Nie pamiętasz hasła?” → `/auth/forgot-password`.
   - Wpisuje e‑mail, wysyła.
   - Widzi komunikat o wysłaniu maila, niezależnie od istnienia konta.

---

## 2. Logika backendowa

### 2.1. Nowe endpointy API

Nowa przestrzeń routingu auth:

- `src/pages/api/auth/register.ts`
- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/logout.ts`
- (opcjonalnie) `src/pages/api/auth/forgot-password.ts`

#### 2.1.1. `POST /api/auth/register`

- Wejście (JSON):

```jsonc
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

- Przebieg:
  - Sprawdzenie metody: tylko `POST`, inaczej `405 Method Not Allowed`.
  - Parsowanie `request.json()`.
  - Walidacja Zod (patrz 2.2).
  - `const supabase = Astro.locals.supabase;`
  - `supabase.auth.signUp({ email, password })`.
  - Jeśli błąd Supabase:
    - Jeżeli e‑mail już istnieje → `409` + `{ code: 'EMAIL_ALREADY_REGISTERED', message: '...' }`.
    - Inne przypadki → `500` + `{ code: 'AUTH_PROVIDER_ERROR', message: '...' }`.
  - Jeśli sukces:
    - Rekomendacja: auto‑login – wykorzystać zwróconą sesję Supabase i ustawić cookies (w podejściu `createServerClient` / middleware).
    - Zwrócić `201 Created`:

```jsonc
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### 2.1.2. `POST /api/auth/login`

- Wejście (JSON):

```jsonc
{
  "email": "user@example.com",
  "password": "password123"
}
```

- Przebieg:
  - Guard `POST` + walidacja wejścia.
  - `const supabase = Astro.locals.supabase;`
  - `supabase.auth.signInWithPassword({ email, password })`.
  - Jeżeli Supabase zwraca błąd „Invalid login credentials”:
    - `401` + `{ code: 'INVALID_CREDENTIALS', message: 'Nieprawidłowy e‑mail lub hasło' }`.
  - Inne błędy:
    - `500` + `{ code: 'AUTH_PROVIDER_ERROR', message: '...' }`.
  - Jeśli sukces:
    - Sesja zapisana w cookies (po użyciu `createServerClient`).
    - `200 OK` + `{ user: { id, email } }`.

#### 2.1.3. `POST /api/auth/logout`

- Wejście: brak lub pusty JSON.
- Przebieg:
  - Guard `POST`.
  - `supabase.auth.signOut()`.
  - Wyczyści cookies / sesję.
  - `204 No Content`.

#### 2.1.4. (Opcjonalnie) `POST /api/auth/forgot-password`

- Wejście:

```jsonc
{
  "email": "user@example.com"
}
```

- Przebieg:
  - Walidacja `email`.
  - `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://app.example.com/auth/reset-password/confirm' })`.
  - Zwraca zawsze `200 OK` z komunikatem:

```jsonc
{
  "message": "Jeśli konto istnieje, wysłaliśmy link resetujący hasło"
}
```

### 2.2. Mechanizm walidacji danych wejściowych

- Nowy moduł `src/lib/validation/auth.ts`:
  - `LoginSchema`:
    - `email: string().email()`
    - `password: string().min(1)`
  - `RegisterSchema`:
    - `email: string().email()`
    - `password: string().min(8)`
  - `ForgotPasswordSchema` (opcjonalne):
    - `email: string().email()`

- Zastosowanie w endpointach:
  - Na początku handlera:
    - `const payload = await request.json();`
    - `const result = LoginSchema.safeParse(payload);`
    - Jeśli `!result.success` → `400 Bad Request` + `{ code: 'VALIDATION_ERROR', errors: [...] }`.

- Spójne formaty błędów:
  - W `src/lib/http.ts` (lub podobnym):
    - Helper `jsonError(status, code, message, details?)`.
  - Endpoint zwraca zawsze JSON o kształcie:

```jsonc
{
  "code": "INVALID_CREDENTIALS",
  "message": "Nieprawidłowy e‑mail lub hasło"
}
```

### 2.3. Obsługa wyjątków

- Zasady (zgodne z `shared.mdc`):
  - Zastosowanie guard clauses – metody HTTP i walidacja na początku.
  - Minimalne try/catch wokół wywołań Supabase.
  - Logowanie błędów technicznych (np. `console.error` lub abstrakcja loggera) z ograniczeniem wrażliwych danych.

- Typowe mapowania:
  - Błąd walidacji → `400 VALIDATION_ERROR`.
  - Błędy Auth Supabase:
    - Nieprawidłowe dane logowania → `401 INVALID_CREDENTIALS`.
    - E‑mail zajęty → `409 EMAIL_ALREADY_REGISTERED`.
    - Inne błędy → `500 AUTH_PROVIDER_ERROR`.

### 2.4. Aktualizacja renderowania SSR (z uwzględnieniem `astro.config.mjs`)

- Dzięki `output: "server"` i adapterowi Node:
  - Wszystkie strony Astro mogą korzystać z `Astro.locals.supabase` (ustawianego w middleware).

- Strony wymagające auth:
  - `app/generator.astro`, `app/flashcards.astro`, `app/learn.astro`:
    - Na początku:

```ts
const { data } = await Astro.locals.supabase.auth.getUser();
if (!data.user) {
  // redirect 302 do /auth/login
}
```

- Strony auth:
  - `auth/login.astro`, `auth/register.astro`:
    - Analogiczna logika, ale w odwrotną stronę:

```ts
const { data } = await Astro.locals.supabase.auth.getUser();
if (data.user) {
  // redirect 302 do /app/generator
}
```

- `index.astro`:
  - Jeżeli user jest zalogowany, od razu przekierowuje do `/app/generator`, zapewniając płynny powrót do aplikacji.

---

## 3. System autentykacji – Supabase Auth + Astro

### 3.1. Integracja Supabase w middleware Astro

Obecnie:

- `src/middleware/index.ts`:

```ts
import { defineMiddleware } from 'astro:middleware';
import { supabaseClient } from '../db/supabase.client';

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

Docelowo dla pełnego authu SSR z cookies:

- Należy rozbudować integrację według wzorca `createServerClient` Supabase (architekturalnie):
  - Middleware tworzy **per‑request** klienta:
    - Czyta cookies z `context.request`.
    - Przekazuje funkcje do ustawiania `Set-Cookie` w odpowiedzi.
  - Taki klient jest przypisywany do `context.locals.supabase`.

Efekt:

- `locals.supabase.auth.getUser()` odzwierciedla aktualną sesję użytkownika na backendzie.
- Endpointy i strony Astro używają jednego źródła prawdy o sesji.

> Na tym etapie specyfikacja zakłada zgodność z obecnym kodem (globalny klient), ale wskazuje kierunek ewolucji do `createServerClient`, który nie wymaga zmian w kontraktach API – jedynie w implementacji middleware/klienta.

### 3.2. Rejestracja (US‑001)

- Wykorzystanie: `supabase.auth.signUp({ email, password })`.
- Brak obowiązkowej weryfikacji e‑mail w MVP → możemy:
  - Auto‑logować użytkownika po rejestracji (preferowany UX),
  - Lub wymagać logowania w kolejnym kroku (przekierowanie do `/auth/login`).

Zgodność z PRD:

- „Po pomyślnej rejestracji użytkownik zostaje zalogowany **lub** ma możliwość zalogowania się” – obie ścieżki są dopuszczalne, implementacja może wybrać jedną.

### 3.3. Logowanie (US‑002)

- Supabase: `auth.signInWithPassword({ email, password })`.
- Utrzymywanie sesji:
  - W architekturze cookie‑based SSR:
    - Sesja zapisywana przez Supabase w cookies, efektywnie dostępna na backendzie.
  - Po stronie UI:
    - Nie przechowujemy tokenów w localStorage – rely on cookies.

Scenariusz:

- Użytkownik podaje dane → `POST /api/auth/login`.
- Backend:
  - Waliduje dane.
  - Wywołuje Supabase Auth.
  - Ustawia sesję.
  - Zwraca `200` z minimalnymi danymi usera.
- Frontend:
  - Redirect do `/app/generator`.

### 3.4. Wylogowanie (US‑003)

- `supabase.auth.signOut()` w endpointzie `POST /api/auth/logout`.
- Bieżąca sesja (cookies) jest usuwana.
- Po stronie UI:
  - Po sukcesie redirect do `/auth/login` lub `/`.
  - SSR na kolejnych żądaniach nie znajdzie już usera → guardy auth przeniosą użytkownika do logowania.

### 3.5. Bezpieczny dostęp do treści (US‑013)

**Poziom bazy danych (Supabase RLS):**

- Dla tabel domenowych (`flashcards`, `categories`, `generations`) RLS musi być włączony.
- Polityki:
  - `select`, `insert`, `update`, `delete` dla roli `authenticated`:
    - warunek `user_id = auth.uid()`.
  - Brak dostępu dla roli `anon`.

Efekt:

- Nawet gdyby API zostało błędnie zaimplementowane, Supabase nie zwróci danych innego użytkownika.

**Poziom API (Astro):**

- Endpointy `/api/v1/flashcards`, `/api/v1/categories`, `/api/v1/flashcards/generate`, `/api/v1/flashcards/accept`:
  - Nie przyjmują `user_id` w body – ustalają go z sesji:

```ts
const { data } = await locals.supabase.auth.getUser();
if (!data.user) {
  return new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Unauthorized' }), {
    status: 401,
  });
}
const userId = data.user.id;
```

  - Wszystkie zapytania do Supabase używają tego `userId` (jako wartości pola lub filtra) i polegają na RLS.

**Poziom UI:**

- Layout i strony wymagające auth nie renderują się dla niezalogowanego użytkownika.
- Nawigacja ukrywa linki do sekcji wymagających logowania, gdy user jest niezalogowany.

### 3.6. Odzyskiwanie hasła – przygotowana ścieżka

Choć PRD wskazuje, że pełny flow resetu hasła nie jest obowiązkowy w MVP, moduł auth jest zaprojektowany tak, aby:

- Można było dodać stronę `GET /auth/forgot-password` z prostym formularzem.
- W backendzie dodać endpoint `POST /api/auth/forgot-password` wywołujący `supabase.auth.resetPasswordForEmail`.
- Później dodać `GET /auth/reset-password/confirm` obsługujący link z maila Supabase (update hasła po stronie użytkownika).

Ta ścieżka nie narusza żadnych istniejących kontraktów, a jedynie rozszerza funkcjonalność, reużywając istniejącą integrację Supabase + Astro.

---

Ta specyfikacja opisuje pełną architekturę modułu auth (UI, backend, integracja z Supabase, RLS) zgodnie z US‑001, US‑002, US‑003 i US‑013, bez zmiany zachowania istniejącej logiki generatora, fiszek i kategorii. Implementacja może być prowadzona iteracyjnie (najpierw rejestracja/logowanie/wylogowanie, potem opcjonalny flow resetu hasła), zachowując spójne kontrakty API i jasny podział odpowiedzialności między Astro (SSR, routing) a React (formularze, UX).

---

## 4. Spójność z PRD i pokrycie User Stories

### 4.1. Zgodność z zapisami PRD

- **Brak trybu gościa** (PRD 3.1, 4.3):
  - Wszystkie kluczowe widoki (`/app/generator`, `/app/flashcards`, `/app/learn`) są zabezpieczone guardami auth (SSR + RLS).
  - Niezalogowany użytkownik zawsze trafia na `/auth/login`, nie ma możliwości wywołania generatora ani operacji na fiszkach/kategoriach bez sesji.
- **Supabase jako jedyne źródło auth**:
  - W architekturze nie ma alternatywnego systemu logowania; wszystkie operacje auth wykorzystują `supabase.auth.*`.
- **Reset hasła**:
  - PRD wskazuje, że „w MVP nie ma obowiązkowej weryfikacji adresu e-mail ani przepisanego flow resetu hasła”.
  - Specyfikacja traktuje odzyskiwanie hasła jako **opcjonalne rozszerzenie** (oznaczone wyraźnie jako „opcjonalne”/„przygotowana ścieżka”) – dzięki temu nie wprowadza wymogu wdrożenia resetu hasła w MVP, a jedynie opisuje, jak można go dodać później.
- **Sesja użytkownika utrzymywana standardowo dla Supabase**:
  - Architektura dopuszcza aktualny globalny klient Supabase, a docelowo `createServerClient` z cookies – oba są zgodne z „standardowym” podejściem Supabase.

### 4.2. Pokrycie User Stories

- **US‑001 – Rejestracja użytkownika**:
  - Formularz `RegisterForm` + endpoint `POST /api/auth/register` spełniają wymagania:
    - Użytkownik wprowadza e‑mail i hasło.
    - Po sukcesie jest zalogowany lub ma możliwość zalogowania się (architektura wspiera oba warianty).
    - Błędy walidacji i błędy Supabase są mapowane na czytelne komunikaty.
- **US‑002 – Logowanie użytkownika**:
  - `LoginForm` + `POST /api/auth/login`:
    - Umożliwiają logowanie przez e‑mail/hasło.
    - Po zalogowaniu następuje redirect na główny ekran aplikacji (`/app/generator`), zgodnie z PRD.
    - Sesja jest utrzymywana przez Supabase; po odświeżeniu user nadal jest zalogowany.
- **US‑003 – Wylogowanie użytkownika**:
  - `POST /api/auth/logout` + przycisk „Wyloguj” w nawigacji:
    - Zapewniają możliwość wylogowania z dowolnego głównego widoku.
    - Po wylogowaniu user traci dostęp do widoków wymagających auth; guardy SSR przekierowują go do `/auth/login`.
- **US‑013 – Bezpieczny dostęp do treści**:
  - RLS w Supabase na poziomie tabel (`user_id = auth.uid()`).
  - Endpointy backendowe nigdy nie przyjmują `user_id` z zewnątrz – ustalają go z `auth.getUser()`.
  - UI nie pozwala na wejście do widoków domenowych bez sesji.

W obecnym kształcie nie ma sprzeczności między `prd.md` a niniejszą specyfikacją; wszystkie wymagania US‑001, US‑002, US‑003 i US‑013 mogą zostać zaimplementowane wprost na bazie opisanej architektury, a elementy resetu hasła (które PRD odkłada na później) są jednoznacznie oznaczone jako opcjonalne.

