import type { APIContext } from "astro";

import { createErrorResponse, createJsonResponse } from "@/lib/http";
import { generateFlashcardsCommandSchema } from "@/lib/validation/flashcards";
import { AiProviderError, generateFlashcardsFromInput } from "@/lib/services/flashcardGeneratorService";

/**
 * Handler endpointu POST /api/v1/flashcards/generate.
 * W wersji deweloperskiej korzysta z „na sztywno” ustawionego userId,
 * aby uprościć testowanie bez pełnej autoryzacji. Docelowo należy tu
 * przywrócić pobieranie użytkownika z Supabase Auth.
 */
export async function POST(context: APIContext): Promise<Response> {
  const { request, locals } = context;
  const supabase = locals.supabase;

  if (!supabase) {
    return createErrorResponse(500, "Internal Server Error", "Supabase client not available.");
  }

  // 1. Użytkownik „na sztywno” na potrzeby dev (bez pełnej autoryzacji).
  // Upewnij się, że taki user istnieje w auth.users ORAZ że polityki RLS
  // pozwalają na operacje dla tego użytkownika (np. poprzez service_role).
  const userId = "11111111-1111-1111-1111-111111111111";

  // 2. Odczyt i walidacja body
  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return createErrorResponse(400, "Bad Request", "Invalid JSON body.");
  }

  const parseResult = generateFlashcardsCommandSchema.safeParse(jsonBody);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];

    return createErrorResponse(400, "Bad Request", firstIssue.message, {
      field: firstIssue.path.join("."),
      issues: parseResult.error.issues,
    });
  }

  const { input } = parseResult.data;

  // 3. Logika domenowa + obsługa błędów
  try {
    const result = await generateFlashcardsFromInput({
      supabase,
      userId,
      input,
    });

    return createJsonResponse(200, result);
  } catch (error) {
    if (error instanceof AiProviderError) {
      return createErrorResponse(
        502,
        "Bad Gateway",
        "AI generation failed, please try again later.",
      );
    }

    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/v1/flashcards/generate", error);

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Internal server error.",
    );
  }
}
