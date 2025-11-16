import type {
  AcceptFlashcardProposalCommand,
  FlashcardDTO,
  FlashcardEntity,
  GenerationEntity,
  GenerationProposalEntity,
} from "@/types";
import type { SupabaseClient } from "@/db/supabase.client";

type DomainErrorType =
  | "ValidationError"
  | "NotFound"
  | "Conflict"
  | "Unauthorized"
  | "Unknown";

/**
 * Kontrolowany błąd domenowy używany do mapowania na odpowiednie kody HTTP.
 */
export class DomainError extends Error {
  readonly type: DomainErrorType;

  readonly details?: Record<string, unknown>;

  constructor(
    type: DomainErrorType,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
    this.type = type;
    this.details = details;
  }
}

export interface AcceptFlashcardProposalContext {
  supabase: SupabaseClient;
  userId: string;
}

type MinimalCategory = Pick<CategoryEntity, "id">;

type MinimalGeneration = Pick<GenerationEntity, "id">;

type MinimalGenerationProposal = Pick<
  GenerationProposalEntity,
  "id" | "generation_id" | "flashcard_id" | "accepted_at"
>;

/**
 * Główna funkcja domenowa dla endpointu
 * POST /api/v1/flashcards/accept.
 *
 * - Waliduje istnienie i własność category, generation i proposal (RLS).
 * - Sprawdza, czy proposal nie został wcześniej zaakceptowany.
 * - Tworzy rekord flashcards z source = "ai".
 * - Aktualizuje generation_proposals.accepted_at oraz .flashcard_id.
 */
export async function acceptFlashcardProposal(
  context: AcceptFlashcardProposalContext,
  command: AcceptFlashcardProposalCommand,
): Promise<FlashcardDTO> {
  const { supabase, userId } = context;
  const { category_id, generation_id, proposal_id, front, back } = command;

  // 1. Walidacja kategorii (istnienie + własność przez RLS).
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", category_id)
    .maybeSingle<MinimalCategory>();

  if (categoryError) {
    throw new DomainError("Unknown", "Failed to validate category.", {
      cause: categoryError.message,
    });
  }

  if (!category) {
    throw new DomainError(
      "NotFound",
      "Generation, proposal or category not found.",
      { field: "category_id" },
    );
  }

  // 2. Walidacja generacji.
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .select("id")
    .eq("id", generation_id)
    .maybeSingle<MinimalGeneration>();

  if (generationError) {
    throw new DomainError("Unknown", "Failed to validate generation.", {
      cause: generationError.message,
    });
  }

  if (!generation) {
    throw new DomainError(
      "NotFound",
      "Generation, proposal or category not found.",
      { field: "generation_id" },
    );
  }

  // 3. Walidacja propozycji.
  const { data: proposal, error: proposalError } = await supabase
    .from("generation_proposals")
    .select("id, generation_id, flashcard_id, accepted_at")
    .eq("id", proposal_id)
    .maybeSingle<MinimalGenerationProposal>();

  if (proposalError) {
    throw new DomainError("Unknown", "Failed to validate proposal.", {
      cause: proposalError.message,
    });
  }

  if (!proposal || proposal.generation_id !== generation_id) {
    throw new DomainError(
      "NotFound",
      "Generation, proposal or category not found.",
      { field: "proposal_id" },
    );
  }

  if (proposal.accepted_at !== null || proposal.flashcard_id !== null) {
    throw new DomainError("Conflict", "Proposal already accepted.", {
      proposal_id,
    });
  }

  // 4. Utworzenie fiszki z source = "ai".
  const { data: flashcard, error: flashcardError } = await supabase
    .from("flashcards")
    .insert({
      user_id: userId,
      category_id,
      front,
      back,
      source: "ai",
    })
    .select("*")
    .single<FlashcardEntity>();

  if (flashcardError || !flashcard) {
    throw new DomainError("Unknown", "Failed to create flashcard.", {
      cause: flashcardError?.message,
    });
  }

  // 5. Aktualizacja propozycji (oznaczenie jako zaakceptowanej).
  const { error: updateError } = await supabase
    .from("generation_proposals")
    .update({
      accepted_at: new Date().toISOString(),
      flashcard_id: flashcard.id,
    })
    .eq("id", proposal_id);

  if (updateError) {
    // Wg planu MVP: fiszka zostaje w bazie, ale zwracamy 500.
    // eslint-disable-next-line no-console
    console.error("Failed to mark proposal as accepted", updateError);

    throw new DomainError("Unknown", "Failed to mark proposal as accepted.", {
      cause: updateError.message,
    });
  }

  // Mapowanie na DTO (bez user_id).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, ...flashcardDto } = flashcard;

  return flashcardDto as FlashcardDTO;
}


