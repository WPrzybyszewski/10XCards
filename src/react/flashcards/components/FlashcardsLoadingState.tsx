export default function FlashcardsLoadingState(): JSX.Element {
  return (
    <div
      data-testid="flashcards-loading"
      role="status"
      aria-live="polite"
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 text-muted-foreground"
    >
      <span className="text-sm font-medium">Wczytywanie fiszek...</span>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-10 animate-pulse rounded-lg bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}
