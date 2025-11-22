import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";

import type { CategoryOption, FlashcardFormValues } from "../types";

const FRONT_LIMIT = 200;
const BACK_LIMIT = 500;

interface FlashcardFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  categories: CategoryOption[];
  categoriesLoading: boolean;
  initialValues: FlashcardFormValues;
  isSubmitting: boolean;
  onSubmit(values: FlashcardFormValues): Promise<void>;
  onCancel(): void;
}

interface FieldErrors {
  front?: string;
  back?: string;
  categoryId?: string;
}

export default function FlashcardFormModal({
  isOpen,
  mode,
  categories,
  categoriesLoading,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: FlashcardFormModalProps): JSX.Element | null {
  const [values, setValues] = useState<FlashcardFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
      setErrors({});
    }
  }, [initialValues, isOpen]);

  const frontLength = useMemo(() => values.front.trim().length, [values.front]);
  const backLength = useMemo(() => values.back.trim().length, [values.back]);

  const validate = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (frontLength < 1 || frontLength > FRONT_LIMIT) {
      nextErrors.front = "Front musi mieć od 1 do 200 znaków.";
    }

    if (backLength < 1 || backLength > BACK_LIMIT) {
      nextErrors.back = "Back musi mieć od 1 do 500 znaków.";
    }

    if (!values.categoryId) {
      nextErrors.categoryId = "Wybierz kategorię.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    await onSubmit({
      categoryId: values.categoryId,
      front: values.front,
      back: values.back,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="flashcard-form-modal"
      className="fixed inset-0 z-40 grid place-items-center bg-background/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card/90 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-foreground">
          {mode === "create" ? "Dodaj fiszkę" : "Edytuj fiszkę"}
        </h2>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-sm font-medium text-foreground">
              Front
              <small className="text-xs text-muted-foreground">
                {frontLength}/{FRONT_LIMIT}
              </small>
            </span>
            <textarea
              name="front"
              value={values.front}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, front: event.target.value }))
              }
              maxLength={FRONT_LIMIT}
              required
              aria-invalid={Boolean(errors.front)}
              className="min-h-[120px] rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground shadow-inner focus-visible:border-primary focus-visible:outline-none"
            />
            {errors.front ? (
              <span className="text-xs text-destructive">{errors.front}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-sm font-medium text-foreground">
              Back
              <small className="text-xs text-muted-foreground">
                {backLength}/{BACK_LIMIT}
              </small>
            </span>
            <textarea
              name="back"
              value={values.back}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, back: event.target.value }))
              }
              maxLength={BACK_LIMIT}
              required
              aria-invalid={Boolean(errors.back)}
              className="min-h-[140px] rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground shadow-inner focus-visible:border-primary focus-visible:outline-none"
            />
            {errors.back ? (
              <span className="text-xs text-destructive">{errors.back}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Kategoria</span>
            <select
              name="categoryId"
              value={values.categoryId}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, categoryId: event.target.value }))
              }
              required
              disabled={categoriesLoading}
              aria-invalid={Boolean(errors.categoryId)}
              className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none disabled:opacity-60"
            >
              <option value="" disabled>
                Wybierz kategorię
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <span className="text-xs text-destructive">{errors.categoryId}</span>
            ) : null}
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {mode === "create" ? "Zapisz" : "Aktualizuj"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


