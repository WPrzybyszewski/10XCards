import type { APIContext } from "astro";

import { createErrorResponse, createJsonResponse } from "@/lib/http";
import {
  createFlashcardBodySchema,
  listFlashcardsQuerySchema,
} from "@/lib/validation/flashcards";
import { createFlashcard, listFlashcards } from "@/lib/services/flashcardService";
import type {
  CreateFlashcardResponseDTO,
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

  if (!locals.session?.user?.id) {
    return createErrorResponse(
      401,
      "Unauthorized",
      "You must be signed in to access flashcards.",
    );
  }

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

export async function POST(context: APIContext): Promise<Response> {
  const { locals } = context;
  const supabase = locals.supabase;
  const session = locals.session;

  if (!session?.user?.id) {
    return createErrorResponse(
      401,
      "Unauthorized",
      "You must be signed in to create flashcards.",
    );
  }

  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available.",
    );
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return createErrorResponse(
      400,
      "Bad Request",
      "Request body must be valid JSON.",
    );
  }

  const parseResult = createFlashcardBodySchema.safeParse(body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];

    return createErrorResponse(400, "Bad Request", firstIssue.message, {
      field: firstIssue.path.join("."),
      issues: parseResult.error.issues,
    });
  }

  const command = parseResult.data;

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", command.category_id)
    .maybeSingle();

  if (categoryError) {
    // eslint-disable-next-line no-console
    console.error(
      "Unexpected error when validating category in POST /api/v1/flashcards",
      categoryError,
    );

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later.",
    );
  }

  if (!category) {
    return createErrorResponse(404, "Not Found", "Category not found.");
  }

  try {
    const flashcard = await createFlashcard({
      supabase,
      userId: session.user.id,
      command,
    });

    return createJsonResponse(201, flashcard satisfies CreateFlashcardResponseDTO);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/v1/flashcards", error);

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later.",
    );
  }
}


