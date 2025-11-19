import type { ChangeEvent } from "react";

interface GeneratorInputPanelProps {
  value: string;
  charCount: number;
  minLength: number;
  maxLength: number;
  isValid: boolean;
  isGenerating: boolean;
  onChange(value: string): void;
  onGenerate(): void;
}

export default function GeneratorInputPanel({
  value,
  charCount,
  minLength,
  maxLength,
  isValid,
  isGenerating,
  onChange,
  onGenerate,
}: GeneratorInputPanelProps): JSX.Element {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    onChange(event.target.value);
  };

  return (
    <section className="generator-input-panel">
      <header>
        <p className="generator-section-label">Krok 1 · Tekst źródłowy</p>
        <h1>Wklej materiał, z którego mamy stworzyć fiszki</h1>
        <p className="generator-section-description">
          Minimalnie {minLength} znaków, maksymalnie {maxLength} znaków. Im
          bardziej precyzyjne notatki, tym lepsze propozycje.
        </p>
      </header>

      <label className="generator-textarea-wrapper">
        <span className="sr-only">Wklej tekst źródłowy</span>
        <textarea
          value={value}
          onChange={handleChange}
          placeholder="Wklej tutaj fragment skryptu, artykułu lub notatek..."
          aria-invalid={!isValid}
          aria-describedby="generator-input-helper"
        />
        <div className="generator-textarea-meta" id="generator-input-helper">
          <span className={!isValid ? "error" : undefined}>
            {charCount} / {minLength}–{maxLength} znaków
          </span>
          {!isValid && (
            <span className="error">
              Tekst musi mieć długość od {minLength} do {maxLength} znaków.
            </span>
          )}
        </div>
      </label>

      <div className="generator-actions">
        <button
          type="button"
          className="primary-button"
          disabled={!isValid || isGenerating}
          onClick={onGenerate}
        >
          {isGenerating ? "Generowanie..." : "Generuj fiszki"}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={() => onChange("")}
          disabled={value.length === 0}
        >
          Wyczyść pole
        </button>
      </div>
    </section>
  );
}

