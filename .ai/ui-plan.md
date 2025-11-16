## Architektura UI dla Fiszki AI


## 1. Przegląd struktury UI

Architektura interfejsu użytkownika Fiszki AI koncentruje się na desktopowej aplikacji webowej z wyraźnym podziałem na:
- widoki publiczne (logowanie/rejestracja),
- obszar aplikacji chronionej (generator AI, lista fiszek, tryb nauki, zarządzanie kategoriami),
- wspólny layout aplikacji z górnym paskiem nawigacyjnym (topbar),
- system modalnych okien edycji i potwierdzeń oraz globalne toasty błędów/sukcesów.

Centralnym elementem doświadczenia jest ekran generatora AI, który jest pierwszym widokiem po zalogowaniu i realizuje główną ścieżkę produktu „auth → generate → accept → learn”. Interfejs korzysta z API opisanych w planie (`/api/v1/categories`, `/api/v1/flashcards`, `/api/v1/flashcards/generate`, `/api/v1/flashcards/accept`, `/api/v1/flashcards/random`) oraz z mechanizmów uwierzytelniania Supabase.

UI jest projektowany w podejściu desktop-first, z podstawową responsywnością dla węższych okien, jednak bez dedykowanej optymalizacji mobilnej w MVP. Kluczowe interakcje (tworzenie, edycja, usuwanie, nauka) są realizowane w prostych, zrozumiałych krokach, z naciskiem na czytelne komunikaty błędów (toasty) i spinnery w stanach ładowania.


## 2. Lista widoków

### 2.1. Widok: Logowanie / Rejestracja

- **Nazwa widoku**: Logowanie/Rejestracja
- **Ścieżka widoku**: `/auth` (z zakładkami `logowanie` / `rejestracja`) lub równoważny wariant
- **Główny cel**:
  - Umożliwienie użytkownikowi utworzenia konta (US-001) lub zalogowania (US-002) do aplikacji.
  - Stanowi bramę do wszystkich widoków chronionych.
- **Kluczowe informacje do wyświetlenia**:
  - Formularz logowania: adres e-mail, hasło.
  - Formularz rejestracji: adres e-mail, hasło (opcjonalnie potwierdzenie hasła, jeśli wymagane).
  - Komunikaty błędów walidacji (niepoprawny email, zbyt krótkie hasło, błędne dane logowania).
  - Informacja o powiązaniu konta z Supabase (bez szczegółów technicznych).
- **Kluczowe komponenty widoku**:
  - Kontener z zakładkami (Tabs) „Zaloguj się” / „Zarejestruj się”.
  - Formularz logowania z polami tekstowymi i przyciskiem „Zaloguj”.
  - Formularz rejestracji z polami tekstowymi i przyciskiem „Zarejestruj”.
  - Przycisk/link do przełączania zakładek.
  - Globalne toasty błędów (np. błędne dane, błędy serwera).
  - Spinner podczas wysyłania żądania do Supabase.
- **UX, dostępność i względy bezpieczeństwa**:
  - Jasne etykiety pól formularzy, pomocne komunikaty walidacyjne, obsługa klawiatury (Tab, Enter, Escape).
  - Ukrywanie haseł z możliwością ich podglądu (toggle „pokaż/ukryj hasło”).
  - Bezpieczna komunikacja z Supabase (HTTPS, brak logowania haseł).
  - Po zalogowaniu przekierowanie do `/app/generator` (lub odpowiednika).
  - W przypadku utraty sesji (401 z API) globalny interceptor przekierowuje do tego widoku i czyści stan aplikacji (US-013).


### 2.2. Widok: Layout aplikacji (shell po zalogowaniu)

- **Nazwa widoku**: Layout aplikacji (topbar + główny content)
- **Ścieżka widoku**: `/app/*` (layout nadrzędny dla widoków chronionych)
- **Główny cel**:
  - Zapewnienie spójnego szkieletu UI dla wszystkich widoków chronionych.
  - Dostarczenie stałego górnego paska nawigacyjnego i miejsca na globalne toasty.
- **Kluczowe informacje do wyświetlenia**:
  - Logo/nazwa produktu („Fiszki AI”).
  - Linki nawigacyjne: „Generator”, „Fiszki”, „Nauka”, „Kategorie”.
  - Sekcja użytkownika: e-mail/skrót + akcja „Wyloguj”.
  - Obszar na globalne komunikaty (toasty w prawym dolnym rogu).
- **Kluczowe komponenty widoku**:
  - Topbar (navbar) z linkami (aktywny link jest podświetlony).
  - Kontener na zawartość widoku podrzędnego (router outlet).
  - Globalny system toastów (błędy na czerwono, ewentualne sukcesy).
  - Globalny komponent spinnera (np. overlay przy dużych operacjach, lub lokalne spinnery w widokach).
- **UX, dostępność i względy bezpieczeństwa**:
  - Topbar zawsze widoczny na desktopie; aktywny link wyszczególniony kolorem / kreską pod spodem.
  - Widoki chronione dostępne tylko po poprawnym uwierzytelnieniu; guard na trasach `/app/*`.
  - Przycisk „Wyloguj” wywołuje zakończenie sesji w Supabase i redirect do `/auth`.
  - Dobre focus states dla elementów nawigacji (widoczne dla klawiatury).


### 2.3. Widok: Generator AI (główny widok po zalogowaniu)

- **Nazwa widoku**: Generator fiszek AI
- **Ścieżka widoku**: `/app/generator`
- **Główny cel**:
  - Umożliwienie użytkownikowi wklejenia tekstu wejściowego (1000–10000 znaków) i uzyskania trzech propozycji fiszek od AI (US-008).
  - Umożliwienie edycji, wyboru kategorii i akceptacji/odrzucenia każdej propozycji (US-009).
- **Kluczowe informacje do wyświetlenia**:
  - Pole tekstowe na input użytkownika z licznikami znaków i informacją o wymaganym zakresie długości.
  - Przyciski: „Generuj fiszki” (aktywny dopiero po spełnieniu walidacji długości).
  - Informacja o stanie generacji (oczekiwanie, sukces, błąd).
  - Panel z trzema propozycjami fiszek:
    - Edytowalne pola „front” i „back” z licznikami znaków.
    - Wybór kategorii (lista z `/api/v1/categories`).
    - Przyciski „Akceptuj” i „Odrzuć” dla każdej propozycji.
  - Boczny panel pomocniczy:
    - Skrócone wskazówki jak pisać dobre fiszki.
    - Informacje o limitach długości i walidacji.
    - Ewentualny krótki log ostatnich zdarzeń sesji (np. generacje).
- **Kluczowe komponenty widoku**:
  - Tekstowe pole wielolinijkowe (textarea) na input z licznikami znaków.
  - Przycisk „Generuj fiszki” z walidacją.
  - Panel 3 kart-propozycji (karty z polami input dla front/back, selektorem kategorii i przyciskami).
  - Boczny panel pomocniczy (np. panel typu sidebar w kolumnie).
  - Spinnery stanu generacji (np. w przycisku podczas żądania POST `/api/v1/flashcards/generate`).
  - Toasty błędów (w tym dedykowane dla `400`, `502`, `500`).
- **UX, dostępność i względy bezpieczeństwa**:
  - Jasna blokada przycisku „Generuj” przy długości tekstu poza zakresem 1000–10000 znaków (US-008).
  - Po błędzie generacji (np. `generate_failed` / błąd 502/500) widoczny toast i opcja ponowienia (US-012).
  - Długości front/back walidowane zarówno po stronie klienta, jak i po stronie API; błędy z `/flashcards/accept` mapowane na czytelne komunikaty.
  - Brak w UI możliwości przesłania `user_id` – wszystko realizowane domyślnie przez token Supabase i API.
  - Ochrona przed przypadkowym utraceniem tekstu wejściowego (opcjonalnie ostrzeżenie przy odświeżeniu, ale nie jest wymagane w PRD).


### 2.4. Widok: Lista fiszek

- **Nazwa widoku**: Lista fiszek
- **Ścieżka widoku**: `/app/flashcards`
- **Główny cel**:
  - Umożliwienie użytkownikowi przeglądania istniejących fiszek (US-010).
  - Zapewnienie punktu wejścia do edycji i usuwania fiszek (US-007).
  - Umożliwienie ręcznego dodawania nowej fiszki (US-006).
- **Kluczowe informacje do wyświetlenia**:
  - Lista fiszek użytkownika (pobrana z `GET /api/v1/flashcards`).
  - Dla każdej fiszki:
    - `front` (przód karty).
    - `category` (np. nazwa kategorii, zmapowana z `category_id`).
    - ewentualnie data utworzenia.
  - Stany:
    - brak fiszek (stan pusty z zachętą do utworzenia lub skorzystania z generatora).
    - ładowanie (spinner).
- **Kluczowe komponenty widoku**:
  - Tabela lub lista kart fiszek.
  - Przycisk „Dodaj fiszkę” (otwiera modal tworzenia).
  - Ikony/przyciski „Edytuj” i „Usuń” dla każdej fiszki (wywołujące modale).
  - Spinnery podczas ładowania listy.
  - Stan pusty (komunikat i CTA „Dodaj pierwszą fiszkę” / „Przejdź do generatora”).
- **UX, dostępność i względy bezpieczeństwa**:
  - Brak filtrów w MVP – lista prezentuje domyślnie wszystkie fiszki użytkownika (można zastosować domyślne sortowanie np. najnowsze na górze).
  - Modal tworzenia/edycji zawiera te same zasady walidacji co wszystkie formularze fiszek (długość front/back, wymagane `category_id`) (US-006, US-007).
  - Usuwanie fiszki wymaga potwierdzenia w modalnym oknie, aby uniknąć przypadkowych usunięć (US-007).
  - Dane ładowane z API tylko dla zalogowanego użytkownika, z zachowaniem RLS po stronie Supabase (US-013).


### 2.5. Widok: Tryb nauki (losowy dobór fiszek)

- **Nazwa widoku**: Tryb nauki
- **Ścieżka widoku**: `/app/learn`
- **Główny cel**:
  - Umożliwienie użytkownikowi prostego uczenia się fiszek w losowej kolejności (US-011).
  - Realizacja pętli nauki: wyświetl front → pokaż back → przejdź do następnej losowej fiszki (US-179–195, 411–416).
- **Kluczowe informacje do wyświetlenia**:
  - Pełnoekranowa karta z:
    - front (pytanie/hasło),
    - po odsłonięciu: back (odpowiedź/wyjaśnienie).
  - Przyciski:
    - „Pokaż odpowiedź”.
    - „Następna”.
  - Wskaźnik postępu sesji:
    - liczba już obejrzanych fiszek vs liczba dostępnych w sesji (przechowywana po stronie klienta).
  - Stany:
    - brak fiszek (stan pusty z sugestią utworzenia lub wygenerowania fiszek).
    - brak kolejnych fiszek w danej sesji („Brak dalszych fiszek – rozpocznij nową sesję”).
- **Kluczowe komponenty widoku**:
  - Centralna karta (flashcard) z możliwością przełączania „pytanie/odpowiedź”.
  - Przyciski sterujące pętlą nauki (pokaż/ukryj odpowiedź, następna).
  - Pasek lub licznik postępu (np. „3/10 fiszek w tej sesji”).
  - Spinnery przy ładowaniu losowej fiszki z `/api/v1/flashcards/random`.
  - Stan pusty (UI z CTA).
- **UX, dostępność i względy bezpieczeństwa**:
  - Obsługa klawiatury (np. Enter/Spacja jako „Pokaż odpowiedź”, Strzałka w prawo jako „Następna”).
  - Zapewnienie, że w ramach sesji nie powtarzają się fiszki – lista ID śledzona w pamięci frontendu (zgodnie z PRD).
  - Łagodne komunikaty w przypadku `404 Not Found` z `/random` (brak fiszek).
  - Brak zapisywania wrażliwych danych w publicznym miejscu; dane treści fiszek pobierane wyłącznie dla zalogowanego użytkownika.


### 2.6. Widok: Kategorie

- **Nazwa widoku**: Zarządzanie kategoriami
- **Ścieżka widoku**: `/app/categories`
- **Główny cel**:
  - Umożliwienie tworzenia, edycji i usuwania kategorii (US-004, US-005).
  - Zapewnienie użytkownikowi prostego sposobu organizowania fiszek.
- **Kluczowe informacje do wyświetlenia**:
  - Lista kategorii użytkownika (z `GET /api/v1/categories`).
  - Dla każdej kategorii:
    - nazwa,
    - ewentualnie data utworzenia.
  - Informacja o kategorii domyślnej „inne” (np. oznaczenie jej jako „domyślna” i brak opcji trwałego usunięcia).
- **Kluczowe komponenty widoku**:
  - Lista kategorii (np. w formie prostych wierszy).
  - Przycisk „Dodaj kategorię” (otwiera modal tworzenia).
  - Przycisk „Edytuj” przy każdej kategorii (otwiera modal z formularzem zmiany nazwy).
  - Przycisk „Usuń” (otwiera modal potwierdzenia; z informacją o przenoszeniu fiszek do „inne”).
  - Spinnery podczas ładowania.
  - Stan pusty (np. przy świeżym koncie – poza kategorią „inne”).
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja nazwy kategorii zgodna z API (niepuste, rozsądna długość, unikalność per użytkownik, obsługa błędów 400/409).
  - Blokowanie usunięcia kategorii „inne” (zgodnie z PRD) – brak przycisku „Usuń” dla tej kategorii.
  - Przy usuwaniu kategorii jasny komunikat, że fiszki zostaną przeniesione do „inne” (US-005).
  - Dane ładowane i modyfikowane wyłącznie dla zalogowanego użytkownika (RLS, US-013).


### 2.7. Widok: Konto (opcjonalny, uproszczony)

- **Nazwa widoku**: Konto użytkownika
- **Ścieżka widoku**: `/app/account` lub panel rozwijany w topbarze
- **Główny cel**:
  - Zapewnienie podstawowych informacji o koncie oraz akcji wylogowania.
- **Kluczowe informacje do wyświetlenia**:
  - Adres e-mail użytkownika (pobrany z Supabase).
  - Ewentualnie krótka informacja o statusie/logice przechowywania danych.
- **Kluczowe komponenty widoku**:
  - Sekcja informacyjna „Twoje konto”.
  - Przycisk „Wyloguj”.
- **UX, dostępność i względy bezpieczeństwa**:
  - Prosty, przejrzysty układ bez dodatkowych ustawień.
  - Bez prezentowania wrażliwych danych (np. brak bezpośredniego ujawniania tokenów).
  - Możliwość łatwego dotarcia z topbaru.


### 2.8. Widoki pomocnicze: 404 / błąd

- **Nazwa widoku**: Strona błędu / 404
- **Ścieżka widoku**: np. `/404` oraz fallback dla nieistniejących tras
- **Główny cel**:
  - Informowanie użytkownika o wejściu na nieistniejącą lub niedostępną stronę.
- **Kluczowe informacje do wyświetlenia**:
  - Prosty komunikat „Nie znaleziono strony” lub „Brak dostępu”.
  - Przycisk powrotu do głównego widoku (generatora).
- **Kluczowe komponenty widoku**:
  - Tekstowy komunikat.
  - Przycisk „Wróć do generatora” (link do `/app/generator`).
- **UX, dostępność i względy bezpieczeństwa**:
  - Minimalistyczny, ale czytelny layout.
  - Brak wycieku szczegółów technicznych błędu.


## 3. Mapa podróży użytkownika

### 3.1. Główny przypadek użycia: „Auth → Generate → Accept → Learn”

1. **Wejście do aplikacji**:
   - Użytkownik otwiera aplikację i trafia na widok logowania/rejestracji (`/auth`).
2. **Rejestracja lub logowanie (US-001, US-002)**:
   - Użytkownik wypełnia formularz rejestracji lub przełącza się na zakładkę logowania.
   - Po poprawnej rejestracji/logowaniu Supabase zwraca token, aplikacja ustawia sesję i przekierowuje do `/app/generator`.
3. **Wejście na widok generatora (US-008)**:
   - Użytkownik widzi pole tekstowe na materiał wejściowy oraz panel pomocniczy z instrukcjami.
   - Wkleja tekst (1000–10000 znaków); widzi licznik znaków.
4. **Wywołanie generowania (US-008, US-012)**:
   - Po spełnieniu limitu długości przycisk „Generuj fiszki” staje się aktywny.
   - Kliknięcie wysyła żądanie `POST /api/v1/flashcards/generate`, pojawia się spinner.
   - W przypadku błędu (np. AI provider) pojawia się czerwony toast z możliwością ponowienia.
5. **Przegląd i edycja propozycji (US-009)**:
   - Po sukcesie użytkownik otrzymuje trzy propozycje w panelu propozycji.
   - Każdą propozycję może edytować (front, back), wybrać kategorię (z `/categories`) oraz:
     - „Akceptuj” → wywołuje `POST /api/v1/flashcards/accept`, tworzy fiszkę i pokazuje toast sukcesu.
     - „Odrzuć” → propozycja ignorowana na poziomie UI.
6. **Przejście do listy fiszek (US-010)**:
   - Użytkownik korzysta z topbara, aby przejść do „Fiszki” (`/app/flashcards`).
   - Widzi nowo utworzone fiszki (AI i manualne).
7. **Przejście do trybu nauki (US-011)**:
   - Użytkownik przechodzi do „Nauka” (`/app/learn`) z topbara lub z CTA na liście fiszek.
   - Tryb nauki losuje fiszki z `/flashcards/random` i prezentuje je w pętli, aż do wyczerpania puli lub zakończenia sesji.


### 3.2. Podróż użytkownika: Ręczne tworzenie/edycja/usuwanie fiszek (US-006, US-007)

1. Użytkownik przechodzi do `/app/flashcards`.
2. Kliknięcie „Dodaj fiszkę” otwiera modal:
   - Wprowadza `front` i `back`, wybiera kategorię.
   - UI waliduje długości; w przypadku błędów nie pozwala zapisać.
   - Po poprawnym zapisie `POST /api/v1/flashcards` i odświeżenie listy.
3. Edycja:
   - Użytkownik klika „Edytuj” przy wybranej fiszce.
   - Pojawia się modal z wartościami front/back i kategorią.
   - Zmiana danych i zapis przez `PATCH /api/v1/flashcards/:id`, refetch listy.
4. Usuwanie:
   - Kliknięcie „Usuń” otwiera modal potwierdzenia.
   - Zatwierdzenie wywołuje `DELETE /api/v1/flashcards/:id`, odświeżenie listy.


### 3.3. Podróż użytkownika: Zarządzanie kategoriami (US-004, US-005)

1. Użytkownik przechodzi do `/app/categories`.
2. Tworzenie:
   - Kliknięcie „Dodaj kategorię” otwiera modal z jednym polem „Nazwa”.
   - Zapis przez `POST /api/v1/categories`.
   - Błędy walidacji (np. duplikat nazwy) wyświetlane jako toast i komunikat przy polu.
3. Edycja:
   - Kliknięcie „Edytuj” przy wybranej kategorii otwiera modal z aktualną nazwą.
   - Zapis przez `PATCH /api/v1/categories/:id` i refetch listy.
4. Usuwanie:
   - Kliknięcie „Usuń” otwiera modal z ostrzeżeniem, że fiszki zostaną przeniesione do kategorii „inne”.
   - Po zatwierdzeniu `DELETE /api/v1/categories/:id`, backend przenosi fiszki; UI odświeża listę.


### 3.4. Podróż użytkownika: Wylogowanie (US-003)

1. Użytkownik klika „Wyloguj” w topbarze lub na ekranie konta.
2. Aplikacja:
   - Zleca Supabase wylogowanie (unieważnia token).
   - Czyści lokalny stan (np. cache zapytań).
   - Przekierowuje do `/auth`.


## 4. Układ i struktura nawigacji

- **Topbar (nawigacja główna)**:
  - Logo/nazwa po lewej.
  - Linki: „Generator”, „Fiszki”, „Nauka”, „Kategorie” – dostępne tylko po zalogowaniu.
  - Sekcja użytkownika po prawej: adres e-mail lub ikona profilu oraz przycisk „Wyloguj”.
  - Aktywny link (na podstawie ścieżki) wyróżniony kolorem / linią pod spodem.

- **Nawigacja publiczna**:
  - Użytkownicy niezalogowani mają dostęp tylko do `/auth`.
  - Przełączanie między logowaniem a rejestracją w ramach Tabs.

- **Nawigacja wewnątrz widoków**:
  - W generatorze: brak dodatkowych zakładek, główny przepływ w jednym widoku.
  - Na liście fiszek: przyciski otwierające modale (dodanie/edycja/usunięcie).
  - W trybie nauki: przyciski na samej karcie („Pokaż odpowiedź”, „Następna”).

- **Guardy i interceptor**:
  - Wszystkie trasy `/app/*` są chronione; brak ważnej sesji → redirect do `/auth`.
  - Globalny interceptor żądań HTTP:
    - Kod `401` → wylogowanie i redirect na `/auth`.
    - Inne błędy → odpowiednie toasty („coś poszło nie tak”, „brak zasobu” itp.).


## 5. Kluczowe komponenty

1. **Topbar (Nawigacja główna)**:
   - Stały pasek z linkami do głównych widoków po zalogowaniu.
   - Odpowiada za orientację użytkownika w aplikacji.

2. **Layout aplikacji (`AppShell`)**:
   - Odpowiada za wspólny układ: topbar, obszar główny, miejsce na toasty.
   - Otacza wszystkie widoki `/app/*`.

3. **Formularz Auth (Logowanie/Rejestracja)**:
   - Jeden komponent z zakładkami Tabs.
   - Używany w widoku `/auth`.

4. **Textarea wejściowa generatora**:
   - Duże pole tekstowe z licznikami znaków (min/max).
   - Obsługuje walidację wymaganą przez `POST /flashcards/generate`.

5. **Panel propozycji AI (3 karty)**:
   - Komponent renderujący listę 3 propozycji.
   - Dla każdej propozycji:
     - edytowalne pola front/back z walidacją długości,
     - select kategorii,
     - przyciski „Akceptuj” (mutacja `POST /flashcards/accept`) i „Odrzuć”.

6. **Boczny panel pomocniczy (Generator)**:
   - Tekstowe wskazówki, informacje o limitach, ewentualnie mini-log sesji.
   - Wspiera użytkownika w tworzeniu dobrego inputu.

7. **Lista fiszek**:
   - Tabela lub lista kart z podstawowymi informacjami.
   - Wiersze/karty z akcjami „Edytuj” i „Usuń”.

8. **Modal tworzenia/edycji fiszki**:
   - Formularz z polami `front`, `back`, `category`.
   - Walidacja długości i wymaganej kategorii.
   - Wspólny komponent, używany w kontekście „Dodaj fiszkę” i „Edytuj”.

9. **Modal potwierdzenia usunięcia (fiszki/kategorii)**:
   - Prosty komunikat z opisem konsekwencji oraz przyciskami „Anuluj” / „Usuń”.
   - W przypadku kategorii dodatkowa informacja o przeniesieniu fiszek do „inne”.

10. **Lista kategorii**:
    - Komponent renderujący listę nazw kategorii.
    - Integruje się z modalem tworzenia/edycji/usunięcia.

11. **Karta nauki (Flashcard Learn)**:
    - Centralny komponent prezentujący front/back.
    - Przycisk „Pokaż odpowiedź” oraz „Następna”.
    - Wskaźnik postępu sesji.

12. **Globalne toasty**:
    - Komponent wyświetlający komunikaty:
      - błędy (na czerwono), np. walidacja, błędy API, problem z generacją;
      - ewentualne sukcesy (np. „Fiszka zapisana”, „Kategoria utworzona”).
    - Pozycjonowane w prawym dolnym rogu, automatycznie znikające z możliwością ręcznego zamknięcia.

13. **Spinnery ładowania**:
    - Proste wskaźniki ładowania:
      - inline (w przyciskach),
      - w widokach (np. zamiast listy podczas pierwszego ładowania),
      - opcjonalnie jako overlay przy krytycznych operacjach.

14. **Komponent błędu/stanów pustych**:
    - Reużywalny komponent do prezentacji:
      - braku fiszek,
      - braku kategorii,
      - braku fiszek do nauki,
      - ogólnych problemów („spróbuj ponownie”).
    - Zawiera CTA (np. „Dodaj fiszkę”, „Przejdź do generatora”).

15. **Guard autoryzacji**:
    - Komponent lub logika routera weryfikująca obecność ważnej sesji.
    - Chroni wszystkie widoki `/app/*`.

Ta architektura UI jest bezpośrednio oparta na wymaganiach PRD, planie API oraz ustaleniach z sesji planowania. Zapewnia pełne pokrycie historyjek użytkownika (US-001 – US-013) oraz czytelne mapowanie wymagań produktowych na konkretne widoki, przepływy i komponenty interfejsu użytkownika. Dzięki temu może stanowić solidną podstawę do dalszego projektowania wizualnego i implementacji w stosie Astro + React + Tailwind + Shadcn/ui, z integracją z Supabase i endpointami API opisanymi w specyfikacji backendu.


