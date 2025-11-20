globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createErrorResponse, a as createJsonResponse } from '../../../../chunks/http_CyLw5LLr.mjs';
import { a as acceptFlashcardProposalSchema } from '../../../../chunks/flashcards_xOHMtYQ2.mjs';
export { r as renderers } from '../../../../chunks/_@astro-renderers_SvKBFpRS.mjs';

class DomainError extends Error {
  type;
  details;
  constructor(type, message, details) {
    super(message);
    this.name = "DomainError";
    this.type = type;
    this.details = details;
  }
}
async function acceptFlashcardProposal(context, command) {
  const { supabase, userId } = context;
  const { category_id, generation_id, proposal_id, front, back } = command;
  const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("id", category_id).maybeSingle();
  if (categoryError) {
    throw new DomainError("Unknown", "Failed to validate category.", {
      cause: categoryError.message
    });
  }
  if (!category) {
    throw new DomainError(
      "NotFound",
      "Generation, proposal or category not found.",
      { field: "category_id" }
    );
  }
  const { data: generation, error: generationError } = await supabase.from("generations").select("id").eq("id", generation_id).maybeSingle();
  if (generationError) {
    throw new DomainError("Unknown", "Failed to validate generation.", {
      cause: generationError.message
    });
  }
  if (!generation) {
    throw new DomainError(
      "NotFound",
      "Generation, proposal or category not found.",
      { field: "generation_id" }
    );
  }
  const { data: proposal, error: proposalError } = await supabase.from("generation_proposals").select("id, generation_id, flashcard_id, accepted_at").eq("id", proposal_id).maybeSingle();
  if (proposalError) {
    throw new DomainError("Unknown", "Failed to validate proposal.", {
      cause: proposalError.message
    });
  }
  if (!proposal || proposal.generation_id !== generation_id) {
    throw new DomainError(
      "NotFound",
      "Generation, proposal or category not found.",
      { field: "proposal_id" }
    );
  }
  if (proposal.accepted_at !== null || proposal.flashcard_id !== null) {
    throw new DomainError("Conflict", "Proposal already accepted.", {
      proposal_id
    });
  }
  const { data: flashcard, error: flashcardError } = await supabase.from("flashcards").insert({
    user_id: userId,
    category_id,
    front,
    back,
    source: "ai"
  }).select("*").single();
  if (flashcardError || !flashcard) {
    throw new DomainError("Unknown", "Failed to create flashcard.", {
      cause: flashcardError?.message
    });
  }
  const { error: updateError } = await supabase.from("generation_proposals").update({
    accepted_at: (/* @__PURE__ */ new Date()).toISOString(),
    flashcard_id: flashcard.id
  }).eq("id", proposal_id);
  if (updateError) {
    console.error("Failed to mark proposal as accepted", updateError);
    throw new DomainError("Unknown", "Failed to mark proposal as accepted.", {
      cause: updateError.message
    });
  }
  const { user_id, ...flashcardDto } = flashcard;
  return flashcardDto;
}

async function POST(context) {
  const { request, locals } = context;
  const supabase = locals.supabase;
  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available."
    );
  }
  const userId = "11111111-1111-1111-1111-111111111111";
  let jsonBody;
  try {
    jsonBody = await request.json();
  } catch {
    return createErrorResponse(
      400,
      "Bad Request",
      "Invalid JSON body."
    );
  }
  const parseResult = acceptFlashcardProposalSchema.safeParse(jsonBody);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse(
      400,
      "Bad Request",
      firstIssue.message,
      {
        field: firstIssue.path.join("."),
        issues: parseResult.error.issues
      }
    );
  }
  const { generation_id, proposal_id, category_id, front, back } = parseResult.data;
  const command = {
    generation_id,
    proposal_id,
    category_id,
    front,
    back
  };
  try {
    const flashcard = await acceptFlashcardProposal(
      {
        supabase,
        userId
      },
      command
    );
    return createJsonResponse(201, { flashcard });
  } catch (error) {
    if (error instanceof DomainError) {
      switch (error.type) {
        case "ValidationError":
          return createErrorResponse(
            400,
            "Bad Request",
            error.message,
            error.details
          );
        case "Unauthorized":
          return createErrorResponse(
            401,
            "Unauthorized",
            error.message,
            error.details
          );
        case "NotFound":
          return createErrorResponse(
            404,
            "Not Found",
            error.message,
            error.details
          );
        case "Conflict":
          return createErrorResponse(
            409,
            "Conflict",
            error.message,
            error.details
          );
        case "Unknown":
        default:
          console.error(
            "Unknown domain error in POST /api/v1/flashcards/accept",
            error
          );
          return createErrorResponse(
            500,
            "Internal Server Error",
            "Something went wrong. Please try again later."
          );
      }
    }
    console.error(
      "Unexpected error in POST /api/v1/flashcards/accept",
      error
    );
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later."
    );
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
