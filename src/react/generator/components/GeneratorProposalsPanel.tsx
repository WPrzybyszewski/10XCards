import type { CategoryOption, ProposalViewModel } from "../types";
import ProposalCard from "./ProposalCard";

interface GeneratorProposalsPanelProps {
  proposals: ProposalViewModel[];
  categories: CategoryOption[];
  categoriesLoading?: boolean;
  collectionsEnabled?: boolean;
  onChange(proposalId: string, patch: Partial<ProposalViewModel>): void;
  onAccept(proposalId: string): void;
  onReject(proposalId: string): void;
}

export default function GeneratorProposalsPanel({
  proposals,
  categories,
  categoriesLoading = false,
  collectionsEnabled = true,
  onChange,
  onAccept,
  onReject,
}: GeneratorProposalsPanelProps): JSX.Element {
  if (proposals.length === 0) {
    return (
      <section className="generator-empty-panel">
        <p>Wygeneruj fiszki, aby zobaczyć propozycje.</p>
      </section>
    );
  }

  return (
    <section className="generator-proposals-panel">
      <header>
        <p className="generator-section-label">Krok 2 · Propozycje AI</p>
        <h2>Przejrzyj i dostosuj fiszki przed akceptacją</h2>
        <p className="generator-section-description">
          Możesz poprawić pytania i odpowiedzi oraz przypisać odpowiednie
          kategorie. Akceptuj tylko te karty, które rzeczywiście chcesz zapisać.
        </p>
        {!collectionsEnabled && (
          <p className="generator-section-description subtle">
            Moduł kolekcji jest wyłączony – przypisywanie kategorii i zapisywanie
            fiszek jest chwilowo niedostępne.
          </p>
        )}
        {categoriesLoading && (
          <p className="generator-section-description subtle">
            Ładuję listę kategorii...
          </p>
        )}
      </header>

      <div className="generator-proposals-grid">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            categories={categories}
            collectionsEnabled={collectionsEnabled}
            onChange={onChange}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
      </div>
    </section>
  );
}

