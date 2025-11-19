export default function GeneratorSidebar(): JSX.Element {
  return (
    <div className="generator-sidebar">
      <section>
        <p className="generator-section-label">Wskazówki</p>
        <h3>Jak przygotować dobry tekst?</h3>
        <ul>
          <li>Stosuj krótkie akapity i jednoznaczne fakty.</li>
          <li>Unikaj list bullet w tekście źródłowym – wklej czysty tekst.</li>
          <li>
            Jeśli masz wiele tematów, generuj fiszki osobno dla każdej sekcji.
          </li>
        </ul>
      </section>

      <section>
        <p className="generator-section-label">Limity</p>
        <h3>Co sprawdzamy automatycznie?</h3>
        <ul>
          <li>Tekst źródłowy: 1000–10000 znaków.</li>
          <li>Front fiszki: maks. 200 znaków.</li>
          <li>Back fiszki: maks. 500 znaków.</li>
          <li>Każda fiszka musi mieć przypisaną kategorię.</li>
        </ul>
      </section>

      <section>
        <p className="generator-section-label">Status</p>
        <h3>Historia sesji</h3>
        <p>
          W przyszłych iteracjach w tym miejscu pojawią się najważniejsze logi z
          generowania oraz skrót ostatnich akcji.
        </p>
      </section>
    </div>
  );
}

