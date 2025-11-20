import type { APIContext } from "astro";

import { createErrorResponse, createJsonResponse } from "@/lib/http";
import { acceptFlashcardProposalSchema } from "@/lib/validation/flashcards";
import {
  DomainError,
  acceptFlashcardProposal,
} from "@/lib/services/flashcardAcceptService";
import type { AcceptFlashcardProposalCommand } from "@/types";

/**
 * Handler endpointu POST /api/v1/flashcards/accept.
 *
 * W wersji deweloperskiej korzysta z „na sztywno” ustawionego userId,
 * aby uprościć testowanie bez pełnej autoryzacji. Docelowo należy tu
 * przywrócić pobieranie użytkownika z Supabase Auth.
 */
export async function POST(context: APIContext): Promise<Response> {
  const { request, locals } = context;
  const supabase = locals.supabase;
  const userId = locals.session?.user?.id ?? null;

  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available.",
    );
  }

  if (!userId) {
    return createErrorResponse(
      401,
      "Unauthorized",
      "You must be signed in to accept flashcards.",
    );
  }

  // 2. Odczyt i walidacja body JSON za pomocą Zod.
  let jsonBody: unknown;

  try {
    jsonBody = await request.json();
  } catch {
    return createErrorResponse(
      400,
      "Bad Request",
      "Invalid JSON body.",
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
        issues: parseResult.error.issues,
      },
    );
  }

  const { generation_id, proposal_id, category_id, front, back } =
    parseResult.data;

  const command: AcceptFlashcardProposalCommand = {
    generation_id,
    proposal_id,
    category_id,
    front,
    back,
  };

  // 3. Logika domenowa + mapowanie błędów na HTTP.
  try {
    const flashcard = await acceptFlashcardProposal(
      {
        supabase,
        userId,
      },
      command,
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
            error.details,
          );
        case "Unauthorized":
          return createErrorResponse(
            401,
            "Unauthorized",
            error.message,
            error.details,
          );
        case "NotFound":
          return createErrorResponse(
            404,
            "Not Found",
            error.message,
            error.details,
          );
        case "Conflict":
          return createErrorResponse(
            409,
            "Conflict",
            error.message,
            error.details,
          );
        case "Unknown":
        default:
          // eslint-disable-next-line no-console
          console.error(
            "Unknown domain error in POST /api/v1/flashcards/accept",
            error,
          );

          return createErrorResponse(
            500,
            "Internal Server Error",
            "Something went wrong. Please try again later.",
          );
      }
    }

    // eslint-disable-next-line no-console
    console.error(
      "Unexpected error in POST /api/v1/flashcards/accept",
      error,
    );

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later.",
    );
  }
}


