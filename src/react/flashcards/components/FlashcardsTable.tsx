import { Button } from "@/components/ui/button";
import type { FlashcardListItemViewModel } from "../types";

interface FlashcardsTableProps {
  items: FlashcardListItemViewModel[];
  onEdit(id: string): void;
  onDelete(id: string): void;
  pendingEditId: string | null;
  pendingDeleteId: string | null;
}

export default function FlashcardsTable({
  items,
  onEdit,
  onDelete,
  pendingEditId,
  pendingDeleteId,
}: FlashcardsTableProps): JSX.Element {
  return (
    <div data-testid="flashcards-table" className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border/60 text-left">
            <th scope="col" className="py-3 pr-4 font-medium">
              Front
            </th>
            <th scope="col" className="py-3 pr-4 font-medium">
              Kategoria
            </th>
            <th scope="col" className="hidden py-3 pr-4 font-medium md:table-cell">
              Utworzono
            </th>
            <th scope="col" className="py-3 text-right font-medium">
              <span className="sr-only">Akcje</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isEditing = pendingEditId === item.id;
            const isDeleting = pendingDeleteId === item.id;
            return (
              <tr
                key={item.id}
                data-testid="flashcards-row"
                className="border-b border-border/40 last:border-b-0"
              >
                <td className="py-3 pr-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-foreground">{item.frontPreview}</p>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {item.sourceLabel}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{item.categoryName}</td>
                <td className="hidden py-3 pr-4 text-muted-foreground md:table-cell">
                  {item.createdAtLabel}
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      data-testid={`flashcard-edit-${item.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item.id)}
                      disabled={isEditing || isDeleting}
                    >
                      {isEditing ? "Zapisywanie..." : "Edytuj"}
                    </Button>
                    <Button
                      data-testid={`flashcard-delete-${item.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                      disabled={isDeleting || isEditing}
                    >
                      {isDeleting ? "Usuwanie..." : "Usuń"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


