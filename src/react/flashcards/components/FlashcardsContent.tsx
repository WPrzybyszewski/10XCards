import type { FlashcardListItemViewModel } from "../types";
import FlashcardsEmptyState from "./FlashcardsEmptyState";
import FlashcardsErrorState from "./FlashcardsErrorState";
import FlashcardsLoadingState from "./FlashcardsLoadingState";
import FlashcardsTable from "./FlashcardsTable";

interface FlashcardsContentProps {
  items: FlashcardListItemViewModel[];
  isLoading: boolean;
  error: string | null;
  onRetry(): Promise<void> | void;
  onAddClick(): void;
  onGoToGenerator(): void;
  onEdit(id: string): void;
  onDelete(id: string): void;
  pendingEditId: string | null;
  pendingDeleteId: string | null;
}

export default function FlashcardsContent({
  items,
  isLoading,
  error,
  onRetry,
  onAddClick,
  onGoToGenerator,
  onEdit,
  onDelete,
  pendingEditId,
  pendingDeleteId,
}: FlashcardsContentProps): JSX.Element {
  if (isLoading) {
    return <FlashcardsLoadingState />;
  }

  if (error) {
    return <FlashcardsErrorState message={error} onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return (
      <FlashcardsEmptyState
        data-testid="flashcards-empty-state"
        onAddClick={onAddClick}
        onGoToGenerator={onGoToGenerator}
      />
    );
  }

  return (
    <FlashcardsTable
      items={items}
      onEdit={onEdit}
      onDelete={onDelete}
      pendingEditId={pendingEditId}
      pendingDeleteId={pendingDeleteId}
    />
  );
}


