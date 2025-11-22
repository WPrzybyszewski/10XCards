import type {
  CategoryDTO,
  CreateFlashcardCommand,
  FlashcardDTO,
  FlashcardsOrder,
  ListFlashcardsResponseDTO,
  UpdateFlashcardCommand,
} from "@/types";

export interface CategoryOption {
  id: CategoryDTO["id"];
  name: CategoryDTO["name"];
}

export interface FlashcardListItemViewModel {
  id: FlashcardDTO["id"];
  front: FlashcardDTO["front"];
  frontPreview: string;
  back: FlashcardDTO["back"];
  categoryId: FlashcardDTO["category_id"];
  categoryName: string;
  createdAt: FlashcardDTO["created_at"];
  createdAtLabel: string;
  sourceLabel: string;
}

export interface FlashcardsApiParams {
  limit?: number;
  offset?: number;
  order?: FlashcardsOrder;
  category_id?: FlashcardDTO["category_id"];
}

export interface FlashcardsApi {
  list(params: FlashcardsApiParams): Promise<ListFlashcardsResponseDTO>;
  create(command: CreateFlashcardCommand): Promise<FlashcardDTO>;
  update(id: string, command: UpdateFlashcardCommand): Promise<FlashcardDTO>;
  delete(id: string): Promise<void>;
  listCategories(): Promise<CategoryDTO[]>;
}

export interface FlashcardsViewState {
  items: FlashcardListItemViewModel[];
  isLoading: boolean;
  error: string | null;
  categories: CategoryOption[];
  isCategoriesLoading: boolean;
  order: FlashcardsOrder;
  limit: number;
  offset: number;
  isFormModalOpen: boolean;
  formMode: "create" | "edit";
  formInitialValues: FlashcardFormValues;
  isFormSubmitting: boolean;
  isDeleteModalOpen: boolean;
  deleteTargetId: string | null;
  deleteFrontPreview: string | null;
  isDeleteSubmitting: boolean;
  toasts: ToastMessage[];
  rowUpdatingId: string | null;
  rowDeletingId: string | null;
}

export interface FlashcardFormValues {
  categoryId: string;
  front: string;
  back: string;
}

export type ToastVariant = "info" | "success" | "error";

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  message: string;
}

export interface FlashcardsViewActions {
  openCreateModal(): void;
  openEditModal(id: string): void;
  closeFormModal(): void;
  submitForm(values: FlashcardFormValues): Promise<void>;
  openDeleteModal(id: string): void;
  closeDeleteModal(): void;
  confirmDelete(): Promise<void>;
  retryLoading(): Promise<void>;
  goToGenerator(): void;
  dismissToast(id: string): void;
}


