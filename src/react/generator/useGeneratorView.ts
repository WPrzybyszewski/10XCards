import { useCallback, useEffect, useMemo, useState } from "react";

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

function createInitialInputState(): GeneratorInputViewModel {
  return {
    rawValue: "",
    trimmedLength: 0,
    isValidLength: false,
    isGenerating: false,
  };
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

  const [input, setInput] = useState<GeneratorInputViewModel>(createInitialInputState());
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalViewModel[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const setInputValue = useCallback((value: string) => {
    const trimmedLength = value.trim().length;
    setInput((previous) => ({
      ...previous,
      rawValue: value,
      trimmedLength,
      isValidLength: trimmedLength >= MIN_INPUT && trimmedLength <= MAX_INPUT,
    }));
  }, []);

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
    if (!input.isValidLength) {
      pushToast("error", "Tekst musi mieć długość od 1000 do 10000 znaków.");
      return;
    }

    setInput((previous) => ({ ...previous, isGenerating: true }));

    try {
      const payload = {
        input: input.rawValue.trim(),
      };
      const response = await api.generate(payload);
      setGenerationId(response.generation_id);
      setProposals(response.proposals.map(normalizeProposal));
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
      setInput((previous) => ({ ...previous, isGenerating: false }));
    }
  }, [api, input, pushToast]);

  const updateProposal = useCallback(
    (proposalId: string, patch: Partial<ProposalViewModel>) => {
      setProposals((previous) =>
        previous.map((proposal) =>
          proposal.id === proposalId ? { ...proposal, ...patch } : proposal,
        ),
      );
    },
    [],
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
      const proposal = proposals.find((item) => item.id === proposalId);
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

        setProposals((previous) =>
          previous.filter((item) => item.id !== proposalId),
        );
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
    [api, generationId, proposals, pushToast, updateProposal],
  );

  const rejectProposal = useCallback((proposalId: string) => {
    setProposals((previous) =>
      previous.filter((proposal) => proposal.id !== proposalId),
    );
    pushToast("info", "Propozycja została odrzucona.");
  }, [pushToast]);

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

