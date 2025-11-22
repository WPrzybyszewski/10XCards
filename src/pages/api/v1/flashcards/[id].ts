import type { APIContext } from "astro";

import { createErrorResponse, createJsonResponse } from "@/lib/http";
import { deleteFlashcard, updateFlashcard } from "@/lib/services/flashcardService";
import {
  deleteFlashcardParamsSchema,
  updateFlashcardBodySchema,
  updateFlashcardParamsSchema,
} from "@/lib/validation/flashcards";

export async function DELETE(context: APIContext): Promise<Response> {
  const { locals, params } = context;
  const supabase = locals.supabase;
  const session = locals.session;

  if (!session?.user?.id) {
    return createErrorResponse(
      401,
      "Unauthorized",
      "You must be signed in to delete flashcards.",
    );
  }

  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available.",
    );
  }

  const parseResult = deleteFlashcardParamsSchema.safeParse({
    id: params.id ?? "",
  });

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];

    return createErrorResponse(400, "Bad Request", firstIssue.message, {
      field: firstIssue.path.join("."),
      issues: parseResult.error.issues,
    });
  }

  const { id } = parseResult.data;

  try {
    const deleted = await deleteFlashcard({
      supabase,
      userId: session.user.id,
      id,
    });

    if (!deleted) {
      return createErrorResponse(404, "Not Found", "Flashcard not found.");
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in DELETE /api/v1/flashcards/:id", error);

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later.",
    );
  }
}

export async function PATCH(context: APIContext): Promise<Response> {
  const { locals, params } = context;
  const supabase = locals.supabase;
  const session = locals.session;

  if (!session?.user?.id) {
    return createErrorResponse(
      401,
      "Unauthorized",
      "You must be signed in to update flashcards.",
    );
  }

  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available.",
    );
  }

  const paramsResult = updateFlashcardParamsSchema.safeParse({
    id: params.id ?? "",
  });

  if (!paramsResult.success) {
    const firstIssue = paramsResult.error.issues[0];

    return createErrorResponse(400, "Bad Request", firstIssue.message, {
      field: firstIssue.path.join("."),
      issues: paramsResult.error.issues,
    });
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

  const bodyResult = updateFlashcardBodySchema.safeParse(body);

  if (!bodyResult.success) {
    const firstIssue = bodyResult.error.issues[0];

    return createErrorResponse(400, "Bad Request", firstIssue.message, {
      field: firstIssue.path.join("."),
      issues: bodyResult.error.issues,
    });
  }

  const { id } = paramsResult.data;
  const command = bodyResult.data;

  if (command.category_id) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", command.category_id)
      .maybeSingle();

    if (categoryError) {
      // eslint-disable-next-line no-console
      console.error(
        "Unexpected error when validating category in PATCH /api/v1/flashcards/:id",
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
  }

  try {
    const updated = await updateFlashcard({
      supabase,
      userId: session.user.id,
      id,
      command,
    });

    if (!updated) {
      return createErrorResponse(404, "Not Found", "Flashcard not found.");
    }

    return createJsonResponse(200, updated);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in PATCH /api/v1/flashcards/:id", error);

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later.",
    );
  }
}


