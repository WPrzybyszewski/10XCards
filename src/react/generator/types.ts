import type {
  AcceptFlashcardProposalCommand,
  AcceptFlashcardProposalResponseDTO,
  CategoryDTO,
  GenerateFlashcardsCommand,
  GenerateFlashcardsResponseDTO,
} from "@/types";

export interface GeneratorInputViewModel {
  rawValue: string;
  trimmedLength: number;
  isValidLength: boolean;
  isGenerating: boolean;
}

export interface ProposalViewModel {
  id: string;
  index: number;
  front: string;
  back: string;
  categoryId: string | null;
  isSaving: boolean;
  isRejected?: boolean;
  errors?: {
    front?: string;
    back?: string;
    categoryId?: string;
  };
}

export type CategoryOption = Pick<CategoryDTO, "id" | "name">;

export interface GeneratorViewState {
  input: GeneratorInputViewModel;
  generationId: string | null;
  proposals: ProposalViewModel[];
  categories: CategoryOption[];
  isCategoriesLoading: boolean;
  lastError?: string | null;
}

export type GeneratorApi = {
  generate(command: GenerateFlashcardsCommand): Promise<GenerateFlashcardsResponseDTO>;
  accept(command: AcceptFlashcardProposalCommand): Promise<AcceptFlashcardProposalResponseDTO>;
  listCategories(): Promise<CategoryDTO[]>;
};

