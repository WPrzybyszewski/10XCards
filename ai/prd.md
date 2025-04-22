# Dokument wymagań produktu (PRD) – Aplikacja do tworzenia fiszek

## 1. Przegląd produktu
Aplikacja umożliwia szybkie i intuicyjne tworzenie fiszek w formie pytanie-odpowiedź z wykorzystaniem automatycznego generatora (AI) lub ręcznego wprowadzania przez użytkownika. Dzięki temu użytkownicy mogą w łatwy sposób utrwalać wiedzę i organizować informacje.

## 2. Problem użytkownika
Użytkownicy chcą efektywnie przyswajać nowe informacje, jednak tradycyjne tworzenie fiszek jest czasochłonne i wymaga ręcznej pracy. Aplikacja rozwiązuje ten problem poprzez zautomatyzowanie generowania fiszek przy jednoczesnej możliwości ręcznej edycji i tworzenia nowych pytań.

## 3. Wymagania funkcjonalne
- Możliwość wklejenia fragmentu tekstu (np. artykułu, podręcznika), z którego aplikacja automatycznie wygeneruje fiszki.
- Opcja ręcznego tworzenia fiszek (pytanie-odpowiedź) bez użycia AI.
- Edycja istniejących fiszek (zarówno tych wygenerowanych przez AI, jak i utworzonych ręcznie).
- Zapisywanie fiszek w spójnych zestawach lub kategoriach.
- Szybkie przeglądanie zapisanych fiszek w przeglądarce.
- Prosta organizacja i wyszukiwanie fiszek (np. po tagach lub słowach kluczowych).
- Obsługa tworzenia kont użytkowników, logowania i bezpiecznego przechowywania danych.
- (Komentarz 1: W dalszej perspektywie można rozważyć moduł powtórek w odstępach czasowych, który przypomina użytkownikom o nauce fiszek.)

## 4. Granice produktu
- Aplikacja koncentruje się głównie na tworzeniu i podstawowym zarządzaniu fiszkami. Rozbudowane analizy czy zaawansowane systemy rekomendacji mogą zostać wdrożone w dalszych etapach.
- Projekt służy głównie nauce nowych technologii, nie jest zakładana natychmiastowa skalowalność na dużą liczbę użytkowników.  
- Nie uwzględniono jeszcze pełnych mechanizmów bezpieczeństwa wymaganych w organizacjach o dużej wrażliwości danych. (Komentarz 2: Może być konieczne wdrożenie dodatkowych standardów bezpieczeństwa w środowisku produkcyjnym.)

## 5. Historyjki użytkowników

ID: US-001  
Tytuł: Generowanie fiszek na podstawie tekstu  
Opis: Jako użytkownik wklejam fragment tekstu (np. podręcznika, notatek), a aplikacja automatycznie tworzy fiszki pytanie-odpowiedź.  
Kryteria akceptacji:  
- Aplikacja pozwala wkleić tekst.  
- Po kliknięciu przycisku „Generuj” wyświetla listę wygenerowanych fiszek.  
- Każda fiszka zawiera pytanie i odpowiedź.

ID: US-002  
Tytuł: Ręczne wprowadzanie fiszek  
Opis: Jako użytkownik mogę dodać nowe fiszki, wpisując pytanie i odpowiedź samodzielnie.  
Kryteria akceptacji:  
- Mogę utworzyć nową fiszkę, podając pytanie i odpowiedź.  
- Fiszka jest zapisywana w tym samym zbiorze co fiszki wygenerowane przez AI.

ID: US-003  
Tytuł: Edycja i zapisywanie fiszek  
Opis: Jako użytkownik chcę móc przejrzeć listę fiszek i w razie potrzeby zmodyfikować pytanie lub odpowiedź.  
Kryteria akceptacji:  
- Widzę listę fiszek (ręcznych i automatycznie wygenerowanych).  
- Kliknięcie fiszki pozwala na jej edycję.  
- Zapisanie zmian aktualizuje zawartość fiszki.

ID: US-004  
Tytuł: Organizacja fiszek w kategorie  
Opis: Jako użytkownik chcę dodawać fiszki do określonych kategorii, aby lepiej organizować wiedzę.  
Kryteria akceptacji:  
- Mogę tworzyć nowe kategorie (np. Język angielski, Programowanie).  
- Podczas tworzenia lub edycji fiszki mogę przypisać ją do wybranej kategorii.  
- W widoku głównym mogę wyświetlać fiszki przefiltrowane według kategorii.

ID: US-005  
Tytuł: Wyszukiwanie w fiszkach  
Opis: Jako użytkownik chcę wyszukiwać w treści pytań i odpowiedzi, aby szybko odnaleźć potrzebne informacje.  
Kryteria akceptacji:  
- Mogę wpisać słowo kluczowe w polu wyszukiwania.  
- Wynikiem wyszukiwania jest lista fiszek zawierających to słowo w pytaniu lub odpowiedzi.  
- Wyszukiwanie działa także na kategorie lub tagi (jeśli zostały dodane).

ID: US-006  
Tytuł: Rejestracja nowego konta  
Opis: Jako niezarejestrowany użytkownik chcę móc założyć konto, aby moje fiszki były prywatne i dostępne tylko dla mnie.  
Kryteria akceptacji:  
- Mogę podać unikalny adres e-mail i hasło do założenia konta.  
- Po pomyślnej rejestracji mogę zalogować się do aplikacji i tworzyć prywatne fiszki.  
- Błędnie wprowadzone dane (np. już zarejestrowany adres e-mail) skutkują komunikatem o błędzie.

ID: US-007  
Tytuł: Logowanie i autoryzacja  
Opis: Jako zarejestrowany użytkownik chcę móc się zalogować do aplikacji, aby móc korzystać z moich prywatnych fiszek.  
Kryteria akceptacji:  
- Mogę wprowadzić adres e-mail i hasło, a po zalogowaniu mam dostęp do swoich fiszek.  
- Nieprawidłowe dane logowania skutkują komunikatem o błędzie.  
- Wylogowanie powoduje brak dostępu do moich fiszek.

ID: US-008  
Tytuł: Resetowanie hasła  
Opis: Jako zarejestrowany użytkownik chcę móc zresetować hasło w przypadku jego zapomnienia, aby uzyskać ponowny dostęp do aplikacji.  
Kryteria akceptacji:  
- Mogę wprowadzić adres e-mail, na który wysyłany jest link do resetu.  
- Po kliknięciu w link mogę ustawić nowe hasło.  
- Błędny lub nieaktualny link resetujący skutkuje komunikatem o błędzie.

## 6. Metryki sukcesu
- Liczba fiszek generowanych lub tworzonych ręcznie w określonym przedziale czasowym.  
- Częstotliwość logowania się i korzystania z aplikacji.  
- Ocena skuteczności nauki na podstawie opinii użytkowników (poprawność i przydatność fiszek).  
- Średni czas potrzebny do wygenerowania i zapisania nowego zestawu fiszek.  
- Stopień zabezpieczenia i brak nieautoryzowanych dostępów do prywatnych fiszek.  
