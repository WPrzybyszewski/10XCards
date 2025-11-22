import type { APIContext } from "astro";

import { createErrorResponse, createJsonResponse } from "@/lib/http";
import { getRandomFlashcard } from "@/lib/services/flashcardService";
import { randomFlashcardQuerySchema } from "@/lib/validation/flashcards";

export async function GET(context: APIContext): Promise<Response> {
  const { locals, url } = context;
  const supabase = locals.supabase;
  const session = locals.session;

  if (!session?.user?.id) {
    return createErrorResponse(
      401,
      "Unauthorized",
      "You must be signed in to get a random flashcard.",
    );
  }

  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available.",
    );
  }

  const parseResult = randomFlashcardQuerySchema.safeParse({
    category_id: url.searchParams.get("category_id") ?? undefined,
  });

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];

    return createErrorResponse(400, "Bad Request", firstIssue.message, {
      field: firstIssue.path.join("."),
      issues: parseResult.error.issues,
    });
  }

  const { category_id } = parseResult.data;

  try {
    const flashcard = await getRandomFlashcard({
      supabase,
      userId: session.user.id,
      categoryId: category_id,
    });

    if (!flashcard) {
      return createErrorResponse(
        404,
        "Not Found",
        "No flashcards found for this user (and category).",
      );
    }

    return createJsonResponse(200, flashcard);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/v1/flashcards/random", error);

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later.",
    );
  }
}


