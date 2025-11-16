import type { Tables } from './db/database.types';

/**
 * Entity aliases (DB rows).
 * These keep a direct link between DTOs/commands and the Supabase schema.
 */
export type CategoryEntity = Tables<'categories'>;
export type FlashcardEntity = Tables<'flashcards'>;
export type GenerationEntity = Tables<'generations'>;
export type GenerationProposalEntity = Tables<'generation_proposals'>;
export type GenerationErrorLogEntity = Tables<'generation_error_logs'>;

/**
 * Common DTO helpers
 */
export interface PaginationMetaDTO {
  limit: number;
  offset: number;
  total: number | null;
}

/**
 * ID aliases (handy for path/query params)
 */
export type CategoryId = CategoryEntity['id'];
export type FlashcardId = FlashcardEntity['id'];
export type GenerationId = GenerationEntity['id'];
export type GenerationProposalId = GenerationProposalEntity['id'];

export interface CategoryIdParamDTO {
  id: CategoryId;
}

export interface FlashcardIdParamDTO {
  id: FlashcardId;
}

/**
 * Category DTOs & Commands
 *
 * API plan:
 * - GET    /api/v1/categories
 * - POST   /api/v1/categories
 * - PATCH  /api/v1/categories/:id
 * - DELETE /api/v1/categories/:id
 */

// Public representation of a category (no user_id).
export type CategoryDTO = Omit<CategoryEntity, 'user_id'>;

// Query params for listing categories.
export interface ListCategoriesQueryDTO {
  limit?: number;
  offset?: number;
}

// Response for listing categories with pagination.
export interface ListCategoriesResponseDTO extends PaginationMetaDTO {
  items: CategoryDTO[];
}

// Command model for creating a category.
export interface CreateCategoryCommand {
  name: CategoryEntity['name'];
}

// Response DTO for creating a category (single category view).
export type CreateCategoryResponseDTO = CategoryDTO;

// Command model for updating a category (rename).
export interface UpdateCategoryCommand {
  name: CategoryEntity['name'];
}

// Response DTO for updating a category.
export type UpdateCategoryResponseDTO = CategoryDTO;

// DELETE /categories/:id has no body, so it has no dedicated body DTO.

/**
 * Flashcard DTOs & Commands
 *
 * API plan:
 * - GET    /api/v1/flashcards
 * - POST   /api/v1/flashcards
 * - GET    /api/v1/flashcards/:id
 * - PATCH  /api/v1/flashcards/:id
 * - DELETE /api/v1/flashcards/:id
 */

// Public representation of a flashcard (no user_id).
export type FlashcardDTO = Omit<FlashcardEntity, 'user_id'>;

// Allowed ordering options for list flashcards endpoint.
export type FlashcardsOrder = 'created_desc' | 'created_asc';

// Query params for listing flashcards.
export interface ListFlashcardsQueryDTO {
  category_id?: FlashcardEntity['category_id'];
  limit?: number;
  offset?: number;
  order?: FlashcardsOrder;
}

// Response for listing flashcards with pagination.
export interface ListFlashcardsResponseDTO extends PaginationMetaDTO {
  items: FlashcardDTO[];
}

// Command model for creating a manual flashcard.
export interface CreateFlashcardCommand {
  category_id: FlashcardEntity['category_id'];
  front: FlashcardEntity['front'];
  back: FlashcardEntity['back'];
}

// Response DTO for creating a flashcard.
export type CreateFlashcardResponseDTO = FlashcardDTO;

// Response DTO for getting a single flashcard.
export type GetFlashcardResponseDTO = FlashcardDTO;

// Command model for partially updating a flashcard.
export interface UpdateFlashcardCommand {
  category_id?: FlashcardEntity['category_id'];
  front?: FlashcardEntity['front'];
  back?: FlashcardEntity['back'];
}

// Response DTO for updating a flashcard.
export type UpdateFlashcardResponseDTO = FlashcardDTO;

// DELETE /flashcards/:id has no body DTO.

/**
 * AI Generator DTOs & Commands
 *
 * API plan:
 * - POST /api/v1/flashcards/generate
 * - POST /api/v1/flashcards/accept
 */

// Command model for generating flashcard proposals.
export interface GenerateFlashcardsCommand {
  input: string;
}

// Public representation of a generation proposal (subset of columns).
export type GenerationProposalDTO = Pick<
  GenerationProposalEntity,
  'id' | 'index' | 'front' | 'back'
>;

// Response DTO for generate endpoint.
export interface GenerateFlashcardsResponseDTO {
  generation_id: GenerationId;
  proposals: GenerationProposalDTO[];
}

// Command model for accepting a proposal (with optional inline edits).
export interface AcceptFlashcardProposalCommand {
  generation_id: GenerationId;
  proposal_id: GenerationProposalId;
  category_id: FlashcardEntity['category_id'];
  front: FlashcardEntity['front'];
  back: FlashcardEntity['back'];
}

// Response DTO for accept endpoint.
export interface AcceptFlashcardProposalResponseDTO {
  flashcard: FlashcardDTO;
}

/**
 * Learning (Random flashcard) DTOs
 *
 * API plan:
 * - GET /api/v1/flashcards/random
 */

// Query params for random flashcard endpoint.
export interface GetRandomFlashcardQueryDTO {
  category_id?: FlashcardEntity['category_id'];
}

// Response DTO for random flashcard endpoint.
export type GetRandomFlashcardResponseDTO = FlashcardDTO;


