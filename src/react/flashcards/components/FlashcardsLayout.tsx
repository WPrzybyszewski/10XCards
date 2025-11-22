import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface FlashcardsLayoutProps {
  content: ReactNode;
  onAddFlashcard(): void;
  sidebar?: ReactNode;
  isAddDisabled?: boolean;
}

export default function FlashcardsLayout({
  content,
  onAddFlashcard,
  sidebar,
  isAddDisabled = false,
}: FlashcardsLayoutProps): JSX.Element {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Twoje fiszki
          </h1>
          <p className="text-muted-foreground">
            Przeglądaj, edytuj i organizuj swoje karty.
          </p>
        </div>
        <Button
          data-testid="flashcards-add-button"
          onClick={onAddFlashcard}
          disabled={isAddDisabled}
          className="rounded-full px-6"
        >
          Dodaj fiszkę
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-2xl shadow-black/10 backdrop-blur">
          {content}
        </div>
        {sidebar ? (
          <aside className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-2xl shadow-black/10 backdrop-blur">
            {sidebar}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
