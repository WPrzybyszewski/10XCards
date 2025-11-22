import { Button } from "@/components/ui/button";

interface FlashcardsErrorStateProps {
  message: string;
  onRetry(): Promise<void> | void;
}

export default function FlashcardsErrorState({
  message,
  onRetry,
}: FlashcardsErrorStateProps): JSX.Element {
  return (
    <div
      data-testid="flashcards-error-state"
      className="flex flex-col items-center gap-4 rounded-2xl border border-border/80 bg-card/60 px-6 py-10 text-center text-muted-foreground"
      role="alert"
    >
      <p className="text-sm">{message}</p>
      <Button variant="destructive" onClick={onRetry} data-testid="flashcards-retry">
        Spróbuj ponownie
      </Button>
    </div>
  );
}
