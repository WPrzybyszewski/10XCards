import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import type {
  CategoryOption,
  GeneratorInputViewModel,
  ProposalViewModel,
} from "./types";
import { createGeneratorApi } from "./api";

const MIN_INPUT = 1000;
const MAX_INPUT = 10000;

type ToastVariant = "info" | "success" | "error";

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  message: string;
}

const normalizeCategory = (category: CategoryOption): CategoryOption => ({
  id: category.id,
  name: category.name,
});

const normalizeProposal = (proposal: {
  id: string;
  index: number;
  front: string;
  back: string;
}): ProposalViewModel => ({
  id: proposal.id,
  index: proposal.index,
  front: proposal.front,
  back: proposal.back,
  categoryId: null,
  isSaving: false,
});

interface GeneratorFormValues {
  prompt: string;
  proposals: ProposalViewModel[];
}

export default function useGeneratorView(): {
  input: GeneratorInputViewModel;
  categories: CategoryOption[];
  isCategoriesLoading: boolean;
  proposals: ProposalViewModel[];
  toasts: ToastMessage[];
  setInputValue(value: string): void;
  generate(): Promise<void>;
  updateProposal(
    proposalId: string,
    patch: Partial<ProposalViewModel>,
  ): void;
  acceptProposal(proposalId: string): Promise<void>;
  rejectProposal(proposalId: string): void;
  dismissToast(id: string): void;
} {
  const api = useMemo(() => createGeneratorApi(), []);

  const [generationId, setGenerationId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { control, watch, setValue, getValues } = useForm<GeneratorFormValues>({
    defaultValues: {
      prompt: "",
      proposals: [],
    },
    mode: "onChange",
  });

  const { replace, update, remove } = useFieldArray({
    control,
    name: "proposals",
    keyName: "fieldKey",
  });

  const promptValue = watch("prompt") ?? "";
  const proposals = watch("proposals") ?? [];
  const trimmedLength = promptValue.trim().length;
  const isValidLength = trimmedLength >= MIN_INPUT && trimmedLength <= MAX_INPUT;

  const input: GeneratorInputViewModel = useMemo(
    () => ({
      rawValue: promptValue,
      trimmedLength,
      isValidLength,
      isGenerating,
    }),
    [promptValue, trimmedLength, isValidLength, isGenerating],
  );

  const setInputValue = useCallback(
    (value: string) => {
      setValue("prompt", value, { shouldDirty: true });
    },
    [setValue],
  );

  const pushToast = useCallback((variant: ToastVariant, message: string) => {
    setToasts((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        variant,
        message,
      },
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
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, 4000),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, dismissToast]);

  const loadCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    try {
      const result = await api.listCategories();
      const normalized = result.map((category) =>
        normalizeCategory({
          id: category.id,
          name: category.name,
        }),
      );
      setCategories(normalized);
    } catch (error) {
      console.error(error);
      pushToast("error", "Nie udało się załadować kategorii.");
    } finally {
      setIsCategoriesLoading(false);
    }
  }, [api, pushToast]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const generate = useCallback(async () => {
    if (!isValidLength) {
      pushToast("error", "Tekst musi mieć długość od 1000 do 10000 znaków.");
      return;
    }

    setIsGenerating(true);

    try {
      const payload = {
        input: promptValue.trim(),
      };
      const response = await api.generate(payload);
      setGenerationId(response.generation_id);
      replace(response.proposals.map(normalizeProposal));
      pushToast(
        "success",
        "Gotowe! Edytuj propozycje i zaakceptuj wybrane fiszki.",
      );
    } catch (error) {
      console.error(error);
      pushToast(
        "error",
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować fiszek.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [api, promptValue, pushToast, replace, isValidLength]);

  const updateProposal = useCallback(
    (proposalId: string, patch: Partial<ProposalViewModel>) => {
      const currentProposals = getValues("proposals");
      const index = currentProposals.findIndex(
        (proposal) => proposal.id === proposalId,
      );
      if (index === -1) {
        return;
      }

      update(index, { ...currentProposals[index], ...patch });
    },
    [getValues, update],
  );

  const validateProposal = (proposal: ProposalViewModel): string | null => {
    const frontLength = proposal.front.trim().length;
    if (frontLength < 1 || frontLength > 200) {
      return "Front musi mieć od 1 do 200 znaków.";
    }

    const backLength = proposal.back.trim().length;
    if (backLength < 1 || backLength > 500) {
      return "Back musi mieć od 1 do 500 znaków.";
    }

    if (!proposal.categoryId) {
      return "Wybierz kategorię przed zapisem fiszki.";
    }

    if (!generationId) {
      return "Brak identyfikatora generacji – odśwież widok.";
    }

    return null;
  };

  const acceptProposal = useCallback(
    async (proposalId: string) => {
      const currentProposals = getValues("proposals");
      const index = currentProposals.findIndex(
        (item) => item.id === proposalId,
      );
      if (index === -1) {
        return;
      }

      const proposal = currentProposals[index];
      if (!proposal) {
        return;
      }

      const validationError = validateProposal(proposal);
      if (validationError) {
        pushToast("error", validationError);
        return;
      }

      updateProposal(proposalId, { isSaving: true });

      try {
        await api.accept({
          generation_id: generationId!,
          proposal_id: proposal.id,
          category_id: proposal.categoryId!,
          front: proposal.front.trim(),
          back: proposal.back.trim(),
        });

        remove(index);
        pushToast("success", "Fiszka została zapisana.");
      } catch (error) {
        console.error(error);
        pushToast(
          "error",
          error instanceof Error
            ? error.message
            : "Nie udało się zapisać fiszki.",
        );
        updateProposal(proposalId, { isSaving: false });
      }
    },
    [api, generationId, getValues, pushToast, remove, updateProposal],
  );

  const rejectProposal = useCallback(
    (proposalId: string) => {
      const currentProposals = getValues("proposals");
      const index = currentProposals.findIndex(
        (proposal) => proposal.id === proposalId,
      );
      if (index === -1) {
        return;
      }

      remove(index);
      pushToast("info", "Propozycja została odrzucona.");
    },
    [getValues, pushToast, remove],
  );

  return {
    input,
    categories,
    isCategoriesLoading,
    proposals,
    toasts,
    setInputValue,
    generate,
    updateProposal,
    acceptProposal,
    rejectProposal,
    dismissToast,
  };
}

