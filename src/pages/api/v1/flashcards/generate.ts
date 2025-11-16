import type { APIContext } from "astro";

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
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
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
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const parseResult = generateFlashcardsCommandSchema.safeParse(jsonBody);

  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid input",
        details: parseResult.error.issues,
      }),
      { status: 400 },
    );
  }

  const { input } = parseResult.data;

  // 3. Logika domenowa + obsługa błędów
  try {
    const result = await generateFlashcardsFromInput({
      supabase,
      userId,
      input,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return new Response(
        JSON.stringify({
          error: "AI generation failed, please try again later.",
        }),
        { status: 502 },
      );
    }

    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/v1/flashcards/generate", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}


