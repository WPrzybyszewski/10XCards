import type { APIContext } from "astro";

import { createErrorResponse, createJsonResponse } from "@/lib/http";
import { listFlashcardsQuerySchema } from "@/lib/validation/flashcards";
import { listFlashcards } from "@/lib/services/flashcardService";
import type {
  ListFlashcardsQueryDTO,
  ListFlashcardsResponseDTO,
} from "@/types";

/**
 * Handler endpointu GET /api/v1/flashcards.
 *
 * W wersji deweloperskiej pomijamy rzeczywistą autoryzację tokenem.
 * Zakładamy, że Supabase client jest poprawnie skonfigurowany
 * (np. z odpowiednimi uprawnieniami / RLS).
 */
export async function GET(context: APIContext): Promise<Response> {
  const { locals, url } = context;
  const supabase = locals.supabase;

  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available.",
    );
  }

  const searchParams = url.searchParams;

  const parseResult = listFlashcardsQuerySchema.safeParse({
    category_id: searchParams.get("category_id") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
    order: searchParams.get("order") ?? undefined,
  });

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

  const { category_id, limit, offset, order } = parseResult.data;

  const query: Required<ListFlashcardsQueryDTO> = {
    category_id,
    limit,
    offset,
    order,
  };

  try {
    const result = await listFlashcards({
      supabase,
      query,
    });

    return createJsonResponse(200, result satisfies ListFlashcardsResponseDTO);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/v1/flashcards", error);

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later.",
    );
  }
}


