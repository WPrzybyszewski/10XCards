import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToastMessage } from "../types";

interface FlashcardsToastStackProps {
  toasts: ToastMessage[];
  onDismiss(id: string): void;
}

const variantClassMap: Record<ToastMessage["variant"], string> = {
  success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  error: "border-red-400/40 bg-red-500/15 text-red-100",
  info: "border-sky-400/40 bg-sky-500/15 text-sky-100",
};

export default function FlashcardsToastStack({
  toasts,
  onDismiss,
}: FlashcardsToastStackProps): JSX.Element | null {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="flashcards-toast-stack"
      className="fixed bottom-6 right-4 z-50 flex w-full max-w-sm flex-col gap-3 text-sm"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-testid={`flashcards-toast-${toast.variant}`}
          className={cn(
            "flex items-center justify-between rounded-xl border px-4 py-3 shadow-2xl backdrop-blur",
            variantClassMap[toast.variant],
          )}
        >
          <p className="pr-3">{toast.message}</p>
          <Button
            variant="ghost"
            size="icon"
            className="text-inherit hover:bg-white/10"
            onClick={() => onDismiss(toast.id)}
            aria-label="Zamknij powiadomienie"
          >
            ✕
          </Button>
        </div>
      ))}
    </div>
  );
}
