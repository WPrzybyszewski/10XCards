import { Button } from "@/components/ui/button";

interface DeleteFlashcardConfirmModalProps {
  isOpen: boolean;
  frontPreview?: string;
  isDeleting: boolean;
  onConfirm(): Promise<void> | void;
  onCancel(): void;
}

export default function DeleteFlashcardConfirmModal({
  isOpen,
  frontPreview,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteFlashcardConfirmModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="flashcard-delete-modal"
      className="fixed inset-0 z-40 grid place-items-center bg-background/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/90 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-foreground">Usuń fiszkę</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Czy na pewno chcesz usunąć tę fiszkę? Operacji nie można cofnąć.
        </p>
        {frontPreview ? (
          <blockquote className="mt-4 rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            “{frontPreview}”
          </blockquote>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </Button>
        </div>
      </div>
    </div>
  );
}
