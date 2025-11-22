import { useCallback, useEffect, useMemo, useState } from "react";

import { createFlashcardsApi } from "./api";
import type {
  CreateFlashcardCommand,
  FlashcardDTO,
  UpdateFlashcardCommand,
} from "@/types";
import type {
  CategoryOption,
  FlashcardFormValues,
  FlashcardListItemViewModel,
  FlashcardsViewActions,
  FlashcardsViewState,
  ToastMessage,
} from "./types";

const DEFAULT_FORM_VALUES: FlashcardFormValues = {
  categoryId: "",
  front: "",
  back: "",
};

const FRONT_PREVIEW_LIMIT = 80;

const buildPreview = (text: string): string =>
  text.length <= FRONT_PREVIEW_LIMIT
    ? text
    : `${text.slice(0, FRONT_PREVIEW_LIMIT - 1)}…`;

export default function useFlashcardsView(): {
  state: FlashcardsViewState;
  actions: FlashcardsViewActions;
} {
  const api = useMemo(() => createFlashcardsApi(), []);

  const [items, setItems] = useState<FlashcardListItemViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formInitialValues, setFormInitialValues] =
    useState<FlashcardFormValues>(DEFAULT_FORM_VALUES);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteFrontPreview, setDeleteFrontPreview] = useState<string | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [rowUpdatingId, setRowUpdatingId] = useState<string | null>(null);
  const [rowDeletingId, setRowDeletingId] = useState<string | null>(null);

  const limit = 50;
  const offset = 0;
  const order = "created_desc" as const;

  const pushToast = useCallback((variant: ToastMessage["variant"], message: string) => {
    setToasts((previous) => [
      ...previous,
      { id: crypto.randomUUID(), variant, message },
    ]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), 4000),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, dismissToast]);

  const mapFlashcard = useCallback(
    (
      dto: FlashcardDTO,
      categoryMap: Map<string, CategoryOption>,
      formatter: Intl.DateTimeFormat,
    ): FlashcardListItemViewModel => {
      const category = categoryMap.get(dto.category_id);

      return {
        id: dto.id,
        front: dto.front,
        frontPreview: buildPreview(dto.front),
        back: dto.back,
        categoryId: dto.category_id,
        categoryName: category?.name ?? "Brak kategorii",
        createdAt: dto.created_at,
        createdAtLabel: formatter.format(new Date(dto.created_at)),
        sourceLabel: dto.source === "ai" ? "AI" : "Manualna",
      };
    },
    [],
  );

  const refreshFlashcards = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const response = await api.list({ limit, offset, order });

        const categoryMap = new Map(
          categories.map((category) => [category.id, category]),
        );
        const formatter = new Intl.DateTimeFormat("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        const normalized = response.items.map((item) =>
          mapFlashcard(item, categoryMap, formatter),
        );
        setItems(normalized);
      } catch (err) {
        console.error(err);
        const message =
          err instanceof Error ? err.message : "Nie udało się załadować fiszek.";
        if (silent) {
          pushToast("error", message);
        } else {
          setError(message);
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [api, categories, limit, offset, order, mapFlashcard, pushToast],
  );

  const loadCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    try {
      const result = await api.listCategories();
      const normalized = result.map((category) => ({
        id: category.id,
        name: category.name,
      }));
      setCategories(normalized);
    } catch (err) {
      console.error(err);
      pushToast("error", "Nie udało się załadować kategorii.");
    } finally {
      setIsCategoriesLoading(false);
    }
  }, [api, pushToast]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void refreshFlashcards();
  }, [refreshFlashcards]);

  const openCreateModal = useCallback(() => {
    setFormMode("create");
    setFormInitialValues(DEFAULT_FORM_VALUES);
    setEditingId(null);
    setIsFormModalOpen(true);
  }, []);

  const openEditModal = useCallback(
    (id: string) => {
      const target = items.find((item) => item.id === id);
      if (!target) {
        pushToast("error", "Nie znaleziono wskazanej fiszki.");
        return;
      }
      setFormMode("edit");
      setFormInitialValues({
        categoryId: target.categoryId,
        front: target.front,
        back: target.back,
      });
      setEditingId(id);
      setIsFormModalOpen(true);
    },
    [items, pushToast],
  );

  const closeFormModal = useCallback(() => {
    if (isFormSubmitting) {
      return;
    }
    setIsFormModalOpen(false);
    setEditingId(null);
  }, [isFormSubmitting]);

  const submitForm = useCallback(
    async (values: FlashcardFormValues) => {
      setIsFormSubmitting(true);
      try {
        if (formMode === "create") {
          const payload: CreateFlashcardCommand = {
            category_id: values.categoryId,
            front: values.front.trim(),
            back: values.back.trim(),
          };
          await api.create(payload);
          await refreshFlashcards({ silent: true });
          pushToast("success", "Fiszka została utworzona.");
        } else if (editingId) {
          setRowUpdatingId(editingId);
          const payload: UpdateFlashcardCommand = {
            category_id: values.categoryId,
            front: values.front.trim(),
            back: values.back.trim(),
          };
          await api.update(editingId, payload);
          await refreshFlashcards({ silent: true });
          pushToast("success", "Fiszka została zaktualizowana.");
        }

        setIsFormModalOpen(false);
        setEditingId(null);
      } catch (err) {
        console.error(err);
        pushToast(
          "error",
          err instanceof Error ? err.message : "Nie udało się zapisać fiszki.",
        );
      } finally {
        setIsFormSubmitting(false);
        setRowUpdatingId(null);
      }
    },
    [api, formMode, editingId, refreshFlashcards, pushToast],
  );

  const openDeleteModal = useCallback(
    (id: string) => {
      const target = items.find((item) => item.id === id);
      if (!target) {
        pushToast("error", "Nie znaleziono wskazanej fiszki.");
        return;
      }
      setDeleteTargetId(id);
      setDeleteFrontPreview(target.frontPreview);
      setIsDeleteModalOpen(true);
    },
    [items, pushToast],
  );

  const closeDeleteModal = useCallback(() => {
    if (isDeleteSubmitting) {
      return;
    }
    setIsDeleteModalOpen(false);
    setDeleteTargetId(null);
    setDeleteFrontPreview(null);
  }, [isDeleteSubmitting]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTargetId) {
      return;
    }

    setIsDeleteSubmitting(true);
    setRowDeletingId(deleteTargetId);
    try {
      await api.delete(deleteTargetId);
      await refreshFlashcards({ silent: true });
      pushToast("success", "Fiszka została usunięta.");
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      setDeleteFrontPreview(null);
    } catch (err) {
      console.error(err);
      pushToast(
        "error",
        err instanceof Error ? err.message : "Nie udało się usunąć fiszki.",
      );
    } finally {
      setIsDeleteSubmitting(false);
      setRowDeletingId(null);
    }
  }, [api, deleteTargetId, refreshFlashcards, pushToast]);

  const retryLoading = useCallback(async () => {
    await refreshFlashcards();
  }, [refreshFlashcards]);

  const goToGenerator = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.location.assign("/app/generator");
  }, []);

  const state: FlashcardsViewState = {
    items,
    isLoading,
    error,
    categories,
    isCategoriesLoading,
    order,
    limit,
    offset,
    isFormModalOpen,
    formMode,
    formInitialValues,
    isFormSubmitting,
    isDeleteModalOpen,
    deleteTargetId,
    deleteFrontPreview,
    isDeleteSubmitting,
    toasts,
    rowUpdatingId,
    rowDeletingId,
  };

  const actions: FlashcardsViewActions = {
    openCreateModal,
    openEditModal,
    closeFormModal,
    submitForm,
    openDeleteModal,
    closeDeleteModal,
    confirmDelete,
    retryLoading,
    goToGenerator,
    dismissToast,
  };

  return { state, actions };
}


