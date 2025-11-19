import type { CategoryOption, ProposalViewModel } from "../types";

interface ProposalCardProps {
  proposal: ProposalViewModel;
  categories: CategoryOption[];
  onChange(proposalId: string, patch: Partial<ProposalViewModel>): void;
  onAccept(proposalId: string): void;
  onReject(proposalId: string): void;
}

export default function ProposalCard({
  proposal,
  categories,
  onChange,
  onAccept,
  onReject,
}: ProposalCardProps): JSX.Element {
  const frontLength = proposal.front.trim().length;
  const backLength = proposal.back.trim().length;

  const isFrontValid = frontLength >= 1 && frontLength <= 200;
  const isBackValid = backLength >= 1 && backLength <= 500;
  const isCategoryValid = Boolean(proposal.categoryId);
  const canAccept = isFrontValid && isBackValid && isCategoryValid && !proposal.isSaving;

  return (
    <article className="proposal-card">
      <header className="proposal-card__header">
        <p className="generator-section-label">Propozycja #{proposal.index + 1}</p>
        <div className="proposal-card__actions">
          <button
            type="button"
            className="primary-button"
            disabled={!canAccept}
            onClick={() => onAccept(proposal.id)}
          >
            {proposal.isSaving ? "Zapisywanie..." : "Akceptuj"}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => onReject(proposal.id)}
          >
            Odrzuć
          </button>
        </div>
      </header>

      <div className="proposal-card__field">
        <label htmlFor={`front-${proposal.id}`}>Front</label>
        <textarea
          id={`front-${proposal.id}`}
          value={proposal.front}
          maxLength={200}
          onChange={(event) =>
            onChange(proposal.id, { front: event.target.value })
          }
          aria-invalid={!isFrontValid}
        />
        <span className={isFrontValid ? "helper" : "helper error"}>
          {frontLength} / 200
        </span>
      </div>

      <div className="proposal-card__field">
        <label htmlFor={`back-${proposal.id}`}>Back</label>
        <textarea
          id={`back-${proposal.id}`}
          value={proposal.back}
          maxLength={500}
          rows={4}
          onChange={(event) =>
            onChange(proposal.id, { back: event.target.value })
          }
          aria-invalid={!isBackValid}
        />
        <span className={isBackValid ? "helper" : "helper error"}>
          {backLength} / 500
        </span>
      </div>

      <div className="proposal-card__field">
        <label htmlFor={`category-${proposal.id}`}>Kategoria</label>
        <select
          id={`category-${proposal.id}`}
          value={proposal.categoryId ?? ""}
          aria-invalid={!isCategoryValid}
          onChange={(event) =>
            onChange(proposal.id, {
              categoryId: event.target.value || null,
            })
          }
        >
          <option value="">Wybierz kategorię</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {!isCategoryValid && (
          <span className="helper error">Wybierz kategorię, aby zapisać.</span>
        )}
      </div>
    </article>
  );
}

