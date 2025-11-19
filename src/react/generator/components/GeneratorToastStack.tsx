import type { ToastMessage } from "../useGeneratorView";

interface GeneratorToastStackProps {
  toasts: ToastMessage[];
  onDismiss(id: string): void;
}

export default function GeneratorToastStack({
  toasts,
  onDismiss,
}: GeneratorToastStackProps): JSX.Element {
  if (toasts.length === 0) {
    return <></>;
  }

  return (
    <div className="generator-toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`generator-toast ${toast.variant}`}>
          <p>{toast.message}</p>
          <button type="button" onClick={() => onDismiss(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

