## Dokument wymagań produktu (PRD) - Fiszki AI

## 1. Przegląd produktu

Fiszki AI to webowa aplikacja, która pomaga użytkownikom szybciej tworzyć zestawy fiszek edukacyjnych, wykorzystując generowanie treści przez AI oraz prosty mechanizm nauki w oparciu o losowe wyświetlanie kart. MVP ma stanowić zarys docelowego produktu – skupia się na podstawowych ścieżkach: generowaniu fiszek z tekstu, ręcznym tworzeniu, edycji, usuwaniu oraz prostym przeglądaniu i nauce.

Aplikacja w MVP:

- działa jako aplikacja webowa (przeglądarka desktop i mobile),
- obsługuje wyłącznie język polski w interfejsie i zakładanych treściach użytkownika,
- wymaga założenia konta użytkownika (brak trybu gościa),
- korzysta z Supabase do uwierzytelniania i przechowywania danych,
- wykorzystuje zewnętrzny model AI do generowania propozycji fiszek.

Główne cele MVP:

- znaczne skrócenie czasu potrzebnego na stworzenie zestawu fiszek z materiału tekstowego (np. notatek, artykułu),
- umożliwienie użytkownikowi szybkiej edycji i akceptacji wygenerowanych fiszek,
- zapewnienie prostego, intuicyjnego sposobu na przeglądanie i naukę fiszek (bez pełnego algorytmu SRS),
- zbudowanie solidnych fundamentów pod dalsze rozszerzenia (SRS, KPI, bardziej zaawansowana biblioteka).

## 2. Problem użytkownika

Manualne tworzenie wysokiej jakości fiszek edukacyjnych wymaga czasu i koncentracji. Użytkownicy muszą:

- przeanalizować swoje materiały (notatki, artykuły, skrypty),
- wyłuskać z nich kluczowe informacje,
- przekształcić je w zwięzłe pytania i odpowiedzi w formie fiszek.

Proces ten jest pracochłonny, co powoduje, że wiele osób rezygnuje z regularnego korzystania z fiszek i metody spaced repetition, pomimo jej wysokiej skuteczności. W rezultacie:

- użytkownicy uczą się mniej systematycznie,
- wracają do mało efektywnych metod (czytanie notatek, podkreślanie),
- trudno im utrzymać nawyk powtórek.

Fiszki AI ma rozwiązać ten problem, automatyzując generowanie propozycji fiszek na podstawie surowego tekstu oraz oferując prosty interfejs do ich edycji, przechowywania i późniejszej nauki.

## 3. Wymagania funkcjonalne

### 3.1. Uwierzytelnianie i konto użytkownika

Zakres:

- Prosta autoryzacja oparta na Supabase.

Wymagania:

- Użytkownik może:
  - zarejestrować konto,
  - zalogować się na istniejące konto,
  - wylogować się.
- Brak trybu gościa: korzystanie z funkcji tworzenia i nauki fiszek wymaga zalogowania.
- W MVP nie ma obowiązkowej weryfikacji adresu e-mail ani przepisanego flow resetu hasła.
- Sesja użytkownika jest utrzymywana w sposób standardowy dla Supabase (tokeny, odświeżanie).

### 3.2. Kategorie fiszek

Zakres:

- Proste kategoryzowanie fiszek, wymagane dla każdej karty.

Wymagania:

- Użytkownik może:
  - tworzyć własne kategorie (np. „Biologia”, „Historia”),
  - edytować nazwę istniejącej kategorii,
  - usuwać kategorię.
- Każda fiszka musi mieć przypisaną jedną kategorię:
  - zapis fiszki bez kategorii jest blokowany (walidacja).
- Przy usunięciu kategorii:
  - wszystkie fiszki powiązane z tą kategorią są automatycznie przenoszone do kategorii „inne”.
- Kategoria „inne”:
  - jest dostępna dla każdego użytkownika (np. tworzona automatycznie przy zakładaniu konta),
  - nie powinna zostać trwale usunięta (lub usunięcie jest blokowane),
  - może mieć nazwę edytowalną lub nie – decyzja implementacyjna, ale powinna zawsze istnieć kategoria domyślna.

### 3.3. Model danych fiszki i walidacja

Zakres:

- Minimalny, prosty model karty.

Wymagania:

- Fiszka posiada:
  - front (przód) – tekst pytania / hasła,
  - back (tył) – tekst odpowiedzi / wyjaśnienia,
  - category_id – odniesienie do kategorii użytkownika,
  - identyfikator właściciela (user_id),
  - znaczniki czasu (np. created_at, updated_at).
- Format treści:
  - zwykły tekst (bez formatowania, bez Markdown, bez LaTeX),
  - dopuszczalne są polskie znaki i standardowe znaki interpunkcyjne.
- Walidacja długości:
  - front: maksymalnie 200 znaków,
  - back: maksymalnie 500 znaków,
  - długość liczona po trim (usunięciu białych znaków na początku i końcu),
  - próba zapisu (ręcznego lub z propozycji AI) z przekroczeniem limitów jest blokowana z jasnym komunikatem błędu.
- Walidacja kategorii:
  - fiszka musi mieć przypisaną kategorię (wymagane pole),
  - zapis bez kategorii jest blokowany po stronie backendu oraz interfejsu.

### 3.4. Manualne tworzenie, edycja i usuwanie fiszek

Zakres:

- Ręczna praca użytkownika z kartami.

Wymagania:

- Użytkownik (po zalogowaniu) może:
  - utworzyć nową fiszkę:
    - wprowadzić front i back z walidacją długości,
    - wybrać kategorię (lub utworzyć nową kategorię),
    - zapisać fiszkę.
  - edytować istniejącą fiszkę:
    - zmienić front, back, kategorię,
    - zachować te same zasady walidacji.
  - usunąć istniejącą fiszkę.
- Interfejs powinien:
  - wyświetlać liczniki znaków dla front i back,
  - pokazywać komunikaty błędów przy naruszeniu limitów,
  - blokować przycisk zapisu, gdy walidacja jest niespełniona.

### 3.5. Generowanie fiszek przez AI

Zakres:

- Generowanie propozycji fiszek na podstawie tekstu wejściowego użytkownika (input o długości od 1000 do 10000 znaków).

Wymagania:

- Użytkownik (po zalogowaniu) ma dostęp do ekranu generatora.
- Przebieg:
  - Użytkownik wkleja lub wpisuje tekst źródłowy (np. fragment notatek) o długości co najmniej 1000 znaków i maksymalnie 10000 znaków (po trim).
  - Jeśli tekst jest krótszy niż 1000 znaków lub dłuższy niż 10000 znaków, system blokuje generowanie i wyświetla komunikat walidacyjny.
  - Użytkownik wywołuje generowanie.
  - System wysyła zapytanie do modelu AI.
  - System loguje zdarzenie generate_requested.
  - Po poprawnej odpowiedzi AI:
    - system zwraca dokładnie trzy propozycje fiszek,
    - każda propozycja zawiera front i back zgodne z limitami długości (po stronie AI lub po ewentualnym przycięciu i walidacji).
  - W przypadku niepowodzenia generacji:
    - system loguje generate_failed,
    - użytkownik otrzymuje czytelny komunikat błędu oraz opcję ponowienia próby (np. „Spróbuj ponownie”).
- Użytkownik może:
  - przejrzeć każdą z trzech propozycji,
  - edytować front i back przed akceptacją (z zastosowaniem tych samych limitów długości i liczników znaków),
  - wybrać kategorię dla akceptowanej fiszki,
  - zaakceptować lub odrzucić pojedynczą propozycję.
- Po zaakceptowaniu propozycji:
  - system tworzy nową fiszkę w tabeli flashcards,
  - fiszka jest powiązana z użytkownikiem i wybraną kategorią,
  - system loguje proposal_accepted.
- Dane wejściowe i propozycje:
  - input użytkownika oraz trzy propozycje są zapisywane w tabeli generations,
  - brak limitu liczby generacji na użytkownika i brak ustalonego czasu przechowywania w MVP.
- Zachowanie po odświeżeniu:
  - po odświeżeniu widoku generacji system nie musi odtwarzać ekranu z propozycjami; użytkownik zawsze może przejść do listy zaakceptowanych fiszek.

### 3.6. Lista/biblioteka fiszek

Zakres:

- Prosty widok posiadanych fiszek.

Wymagania:

- Użytkownik (po zalogowaniu) ma dostęp do widoku listy swoich fiszek.
- Widok powinien:
  - pokazywać podstawowe informacje o fiszce (front, kategoria, ewentualnie data utworzenia),
  - pozwalać otworzyć fiszkę do edycji,
  - pozwalać usunąć fiszkę.
- W MVP:
  - nie ma wymagań dotyczących zaawansowanej paginacji,
  - nie ma wymagań dotyczących filtrów, sortowania i wyszukiwarki,
  - szczegóły implementacji (np. domyślne sortowanie) są do ustalenia na poziomie projektowym, ale powinny być spójne z intuicją użytkownika (np. najnowsze na górze).

### 3.7. Nauka / przegląd losowy fiszek

Zakres:

- Prosty tryb przeglądania fiszek w celu nauki, bez algorytmu powtórek SRS.

Wymagania:

- Użytkownik może wejść do trybu nauki (np. z głównej nawigacji lub z listy fiszek).
- Tryb nauki:
  - prezentuje pojedynczą, losowo wybraną fiszkę z puli fiszek danego użytkownika,
  - w pierwszym kroku wyświetla tylko front (pytanie/hasło),
  - użytkownik może kliknąć „Pokaż odpowiedź”, aby zobaczyć back,
  - użytkownik może kliknąć „Następna”, aby przejść do kolejnej losowej fiszki.
- W ramach jednej sesji nauki:
  - system powinien unikać ponownego wyświetlania tej samej fiszki,
  - jeśli liczba fiszek została wyczerpana, użytkownik powinien zobaczyć komunikat, że nie ma więcej fiszek w tej sesji (i ewentualnie przycisk „Rozpocznij nową sesję”).
- Użytkownik może w każdej chwili opuścić tryb nauki (np. wracając do listy fiszek).
- W MVP:
  - brak algorytmu SRS,
  - brak wyliczania harmonogramów powtórek,
  - brak śledzenia historii powtórek.

### 3.8. API i warstwa backend

Zakres:

- Minimalne API do obsługi funkcji MVP.

Wymagane główne kontrakty (na poziomie koncepcyjnym):

- Autoryzacja:
  - wykorzystanie mechanizmów Supabase (rejestracja, logowanie, wylogowanie).
- Generowanie:
  - POST /generate
    - wejście: tekst źródłowy,
    - wyjście: dokładnie 3 propozycje fiszek (front, back),
    - logowanie generate_requested i generate_failed.
  - POST /flashcards/accept
    - wejście: identyfikacja propozycji (np. generation_id + indeks) oraz treść front i back po ewentualnej edycji, category_id,
    - działanie: utworzenie rekordu w flashcards,
    - logowanie proposal_accepted.
- CRUD fiszek:
  - GET/POST/PATCH/DELETE /flashcards
    - filtrowanie co najmniej po user_id (implicit z sesji),
    - operacje ograniczone do właściciela fiszki.
- CRUD kategorii:
  - GET/POST/PATCH/DELETE /categories
    - operacje ograniczone do kategorii danego użytkownika,
    - usunięcie kategorii powoduje przeniesienie fiszek do kategorii „inne”.

W MVP nie ma endpointów związanych z algorytmem powtórek SRS.

### 3.9. Logowanie zdarzeń i obserwowalność

Zakres:

- Minimalna telemetria na potrzeby debugowania i prostego wglądu w działanie systemu.

Wymagania:

- System loguje co najmniej:
  - generate_requested – każde wywołanie generowania,
  - generate_failed – nieudane próby generacji,
  - proposal_accepted – akceptacja propozycji i utworzenie fiszki.
- Logi powinny zawierać:
  - identyfikator użytkownika,
  - identyfikator generacji (generation_id),
  - znacznik czasu,
  - status powodzenia/błędu.
- Okres przechowywania logów nie został w MVP ściśle zdefiniowany; powinien być jednak wystarczający do debugowania i wstępnej analizy (np. kilka tygodni).

## 4. Granice produktu

### 4.1. Zakres MVP

W zakres MVP wchodzą:

- rejestracja, logowanie i wylogowywanie użytkowników (Supabase),
- tworzenie, edycja i usuwanie kategorii, z obowiązkowym przypisaniem kategorii do każdej fiszki,
- ręczne tworzenie, edycja i usuwanie fiszek,
- generowanie propozycji fiszek przez AI (dokładnie 3 na jedno zapytanie) z możliwością edycji i akceptacji,
- prosty widok listy fiszek,
- prosty tryb nauki oparty na losowym wyborze fiszek,
- minimalne logowanie zdarzeń powiązanych z generacją i akceptacją.

### 4.2. Poza zakresem MVP

Poza zakresem MVP znajdują się:

- własny, zaawansowany algorytm powtórek (SuperMemo, Anki, SM-2 i podobne),
- harmonogramowanie powtórek i logika SRS (stany kart, interwały, poziomy trudności),
- import materiałów w wielu formatach (PDF, DOCX, obrazy itp.),
- współdzielenie zestawów fiszek między użytkownikami (publikacja, udostępnianie linków, wspólna edycja),
- integracje z zewnętrznymi platformami edukacyjnymi,
- dedykowane aplikacje mobilne (MVP to przeglądarkowa aplikacja webowa),
- rozbudowana biblioteka z zaawansowanymi filtrami, sortowaniem i wyszukiwarką,
- formalne wdrożenie KPI i dashboardów analitycznych (poza minimalnymi logami technicznymi),
- zaawansowane mechanizmy prywatności i zarządzania RODO poza podstawową funkcjonalnością Supabase i platformy.

### 4.3. Ograniczenia i założenia

- Język:
  - interfejs oraz założone treści użytkownika w MVP są w języku polskim.
- Uwierzytelnianie:
  - brak trybu gościa, wszystkie kluczowe funkcje wymagają zalogowania,
  - brak pełnego flow resetu hasła w MVP (może być później).
- Dane generacji:
  - brak limitu liczby generacji na użytkownika,
  - brak zdefiniowanego TTL dla rekordów w generations w MVP.
- Koszty i limity:
  - brak narzuconych limitów wywołań generowania na użytkownika w MVP,
  - szczegółowa kontrola kosztów i ratelimity mogą zostać dodane w późniejszych iteracjach.

## 5. Historyjki użytkowników

### US-001 – Rejestracja użytkownika

Tytuł: Rejestracja nowego użytkownika  
Opis: Jako nowy użytkownik chcę założyć konto, aby móc tworzyć i przechowywać swoje fiszki.  
Kryteria akceptacji:

- Użytkownik może wprowadzić adres e-mail i hasło oraz utworzyć konto.
- Po pomyślnej rejestracji użytkownik zostaje zalogowany lub ma możliwość zalogowania się.
- Próba rejestracji z nieprawidłowymi danymi (np. niepoprawny e-mail) kończy się czytelnym komunikatem błędu.
- Rejestracja korzysta z mechanizmów Supabase.

### US-002 – Logowanie użytkownika

Tytuł: Logowanie do aplikacji  
Opis: Jako zarejestrowany użytkownik chcę zalogować się do aplikacji, aby uzyskać dostęp do swoich fiszek.  
Kryteria akceptacji:

- Użytkownik może podać adres e-mail i hasło oraz zalogować się.
- Po zalogowaniu użytkownik widzi główny ekran aplikacji z dostępem do generatora, listy fiszek i trybu nauki.
- Próba logowania z nieprawidłowymi danymi wyświetla czytelny komunikat błędu.
- Po zalogowaniu sesja użytkownika jest utrzymywana (np. po odświeżeniu strony).

### US-003 – Wylogowanie użytkownika

Tytuł: Wylogowanie z aplikacji  
Opis: Jako zalogowany użytkownik chcę móc się wylogować, aby zabezpieczyć swoje dane na współdzielonym urządzeniu.  
Kryteria akceptacji:

- Na głównych ekranach dostępny jest przycisk lub opcja wylogowania.
- Po wylogowaniu użytkownik traci dostęp do widoków wymagających autoryzacji (generator, lista fiszek, nauka).
- Po wylogowaniu odświeżenie strony nie powoduje automatycznego ponownego zalogowania.

### US-004 – Tworzenie kategorii

Tytuł: Tworzenie nowej kategorii fiszek  
Opis: Jako zalogowany użytkownik chcę tworzyć kategorie, aby organizować swoje fiszki tematycznie.  
Kryteria akceptacji:

- Użytkownik może otworzyć widok zarządzania kategoriami i dodać nową kategorię podając jej nazwę.
- Po zapisaniu nowa kategoria jest dostępna na listach wyboru kategorii przy tworzeniu i edycji fiszek.
- Próba dodania kategorii bez nazwy lub z nazwą niezgodną z walidacją (jeśli istnieje) wyświetla czytelny komunikat błędu.

### US-005 – Edycja i usuwanie kategorii

Tytuł: Edycja i usuwanie kategorii  
Opis: Jako użytkownik chcę edytować i usuwać kategorie, aby utrzymać porządek w swoich zestawach fiszek.  
Kryteria akceptacji:

- Użytkownik może zmienić nazwę istniejącej kategorii; zmiana jest widoczna przy wszystkich przypisanych do niej fiszkach.
- Użytkownik może usunąć kategorię.
- Po usunięciu kategorii wszystkie powiązane fiszki są automatycznie przenoszone do kategorii „inne”.
- Kategoria domyślna „inne” nie może zostać trwale usunięta (lub jej usunięcie jest blokowane z komunikatem).

### US-006 – Ręczne tworzenie fiszki

Tytuł: Ręczne dodanie nowej fiszki  
Opis: Jako zalogowany użytkownik chcę ręcznie dodać fiszkę, aby mieć pełną kontrolę nad jej treścią.  
Kryteria akceptacji:

- Użytkownik może otworzyć formularz tworzenia fiszki i wprowadzić front oraz back.
- Użytkownik musi wybrać kategorię; zapis bez kategorii jest niemożliwy.
- System wyświetla licznik znaków dla front i back.
- Próba zapisu z front dłuższym niż 200 znaków lub back dłuższym niż 500 znaków kończy się blokadą zapisu i komunikatem błędu.
- Po poprawnym zapisie fiszka jest widoczna w liście fiszek.

### US-007 – Edycja i usuwanie fiszki

Tytuł: Edycja i usunięcie istniejącej fiszki  
Opis: Jako użytkownik chcę edytować lub usuwać istniejące fiszki, aby utrzymywać ich aktualność i jakość.  
Kryteria akceptacji:

- Użytkownik może z listy fiszek przejść do edycji wybranej karty.
- W edycji użytkownik może zmienić front, back i kategorię z zachowaniem tych samych reguł walidacji jak przy tworzeniu.
- Zapis zmian aktualizuje fiszkę i jest widoczny w liście oraz w trybie nauki.
- Użytkownik może usunąć fiszkę; po potwierdzeniu usunięcia karta znika z listy i nie jest dostępna w trybie nauki.

### US-008 – Generowanie propozycji fiszek przez AI

Tytuł: Generowanie fiszek z tekstu wejściowego  
Opis: Jako zalogowany użytkownik chcę wkleić tekst i otrzymać propozycje fiszek wygenerowane przez AI, aby szybciej przygotować zestaw do nauki.  
Kryteria akceptacji:

- Użytkownik może wkleić tekst do pola wejściowego na ekranie generatora; tekst musi mieć długość od 1000 do 10000 znaków (po trim), inaczej system blokuje generowanie i wyświetla komunikat walidacyjny.
- Po kliknięciu przycisku generowania system wysyła żądanie do AI i loguje generate_requested.
- Po sukcesie użytkownik otrzymuje dokładnie trzy propozycje fiszek.
- W przypadku błędu generowania użytkownik widzi wyraźny komunikat oraz ma możliwość ponowienia próby; system loguje generate_failed.
- Propozycje są walidowane tak, aby front nie przekraczał 200 znaków, a back 500 znaków; przekroczenie skutkuje odpowiednią obsługą (np. komunikat lub przycięcie zależnie od decyzji implementacyjnej).

### US-009 – Edycja i akceptacja propozycji AI

Tytuł: Akceptacja i zapis wygenerowanej fiszki  
Opis: Jako użytkownik chcę edytować i zaakceptować wybrane propozycje fiszek z AI, aby dopasować je do swoich potrzeb.  
Kryteria akceptacji:

- Użytkownik widzi trzy propozycje fiszek w formie edytowalnych pól front i back.
- Użytkownik może edytować treść i wybrać kategorię dla każdej propozycji.
- Walidacja długości front i back oraz obowiązkowej kategorii działa tak samo jak przy ręcznym tworzeniu fiszek.
- Po kliknięciu akceptacji dla danej propozycji system tworzy nową fiszkę, zapisuje ją w flashcards i loguje proposal_accepted.
- Użytkownik może odrzucić pojedynczą propozycję (bez tworzenia fiszki).

### US-010 – Przegląd listy fiszek

Tytuł: Przegląd posiadanych fiszek  
Opis: Jako użytkownik chcę zobaczyć listę swoich fiszek, aby móc nimi zarządzać i przechodzić do nauki.  
Kryteria akceptacji:

- Po zalogowaniu użytkownik może przejść do widoku listy fiszek.
- Lista pokazuje co najmniej front i kategorię fiszki oraz możliwość przejścia do edycji.
- Użytkownik może usunąć fiszkę bezpośrednio z listy (z potwierdzeniem).
- Widok obsługuje sytuację braku fiszek (stan pusty z komunikatem zachęcającym do utworzenia pierwszej karty lub skorzystania z generatora).

### US-011 – Tryb nauki z losowym doborem fiszek

Tytuł: Prosta nauka fiszek w trybie losowym  
Opis: Jako użytkownik chcę uczyć się, przeglądając swoje fiszki w losowej kolejności, aby powtarzać materiał w prosty sposób.  
Kryteria akceptacji:

- Użytkownik może przejść do trybu nauki z głównej nawigacji lub z listy fiszek.
- W trybie nauki system losuje fiszkę z puli użytkownika i wyświetla jej front.
- Użytkownik może kliknąć „Pokaż odpowiedź”, aby zobaczyć back.
- Po kliknięciu „Następna” system losuje kolejną kartę i w danej sesji nie powtarza kart już pokazanych (dopóki nie zabraknie kart).
- Jeśli użytkownik nie posiada żadnych fiszek, tryb nauki wyświetla stan pusty z sugestią utworzenia lub wygenerowania fiszek.

### US-012 – Obsługa błędów generowania

Tytuł: Informowanie o błędach podczas generowania fiszek  
Opis: Jako użytkownik chcę otrzymać jasne informacje, gdy generowanie fiszek się nie powiedzie, aby wiedzieć, co mogę zrobić dalej.  
Kryteria akceptacji:

- W przypadku niepowodzenia generacji użytkownik widzi komunikat z informacją, że „nie udało się wygenerować fiszek”.
- Użytkownik ma możliwość ponowienia próby (przycisk „Spróbuj ponownie” lub podobny).
- System nie tworzy żadnych fiszek w przypadku niepowodzenia generowania.
- System loguje generate_failed z informacją diagnostyczną (bez ujawniania szczegółów technicznych użytkownikowi).

### US-013 – Bezpieczny dostęp do treści (uwierzytelnianie)

Tytuł: Ograniczenie dostępu do fiszek tylko do właściciela  
Opis: Jako użytkownik chcę mieć pewność, że tylko ja mam dostęp do moich fiszek i kategorii, aby moje materiały do nauki były prywatne.  
Kryteria akceptacji:

- Wszystkie operacje na fiszkach i kategoriach są możliwe wyłącznie po zalogowaniu.
- Zapytania do API dotyczące fiszek i kategorii zwracają wyłącznie dane powiązane z user_id aktualnie zalogowanego użytkownika.
- Próba dostępu do zasobów bez autoryzacji (lub z cudzym user_id) jest odrzucana przez backend.

## 6. Metryki sukcesu

W pierwotnym opisie projektu zaproponowano dwa główne wskaźniki sukcesu:

- odsetek fiszek generowanych przez AI, które są akceptowane przez użytkownika (np. 75%,
- udział fiszek tworzonych z użyciem AI w stosunku do wszystkich tworzonych fiszek (np. 75%).

W decyzjach dotyczących MVP przyjęto jednak, że na tym etapie:

- formalne KPI nie będą aktywnie mierzone ani raportowane,
- główny nacisk zostanie położony na stabilność działania kluczowych ścieżek (auth → generate → accept → learn) oraz subiektyczną ocenę przydatności przez użytkowników.

Metryki i pomiar w MVP:

- system loguje minimalne zdarzenia techniczne:
  - generate_requested,
  - generate_failed,
  - proposal_accepted,
- na podstawie logów z backendu będzie można:
  - wstępnie oszacować relację liczby zaakceptowanych fiszek do liczby wywołań generowania,
  - ocenić stabilność generowania (np. odsetek generate_failed),
  - zidentyfikować potencjalne problemy techniczne (np. wzrost liczby błędów generacji).

Plan na kolejne iteracje:

- na późniejszych etapach rozwoju (poza MVP) można:
  - sformalizować KPI (np. 75% akceptacji, 75% udziału AI w tworzonych fiszkach),
  - rozbudować logowanie i analitykę (np. bardziej szczegółowe eventy użytkowe, dashboardy),
  - powiązać metryki z eksperymentami nad promptami i jakością generowanych fiszek,
  - dodać SRS i mierzyć realny wpływ na wyniki nauki.
