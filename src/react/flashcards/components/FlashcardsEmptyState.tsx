import { Button } from "@/components/ui/button";

interface FlashcardsEmptyStateProps {
  onAddClick(): void;
  onGoToGenerator(): void;
  ["data-testid"]?: string;
}

export default function FlashcardsEmptyState({
  onAddClick,
  onGoToGenerator,
  "data-testid": dataTestId,
}: FlashcardsEmptyStateProps): JSX.Element {
  return (
    <div
      data-testid={dataTestId}
      className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/80 bg-card/50 px-6 py-12 text-center"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Nie masz jeszcze żadnych fiszek
        </h2>
        <p className="text-muted-foreground">
          Dodaj pierwszą fiszkę lub przejdź do generatora, aby stworzyć zestaw.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onAddClick} data-testid="flashcards-empty-add">
          Dodaj pierwszą fiszkę
        </Button>
        <Button
          onClick={onGoToGenerator}
          variant="outline"
          data-testid="flashcards-empty-generator"
        >
          Przejdź do generatora
        </Button>
      </div>
    </div>
  );
}


