import type {
  FlashcardDTO,
  ListFlashcardsQueryDTO,
  ListFlashcardsResponseDTO,
} from "@/types";
import type { SupabaseClient } from "@/db/supabase.client";

export interface ListFlashcardsParams {
  supabase: SupabaseClient;
  query: Required<ListFlashcardsQueryDTO>;
}

/**
 * Serwis domenowy do listowania fiszek użytkownika.
 *
 * Zgodnie z planem:
 * - obsługuje opcjonalny filtr po category_id,
 * - stosuje paginację (limit, offset),
 * - sortuje po created_at zgodnie z order,
 * - nie wylicza total (w MVP total = null).
 */
export async function listFlashcards(
  params: ListFlashcardsParams,
): Promise<ListFlashcardsResponseDTO> {
  const {
    supabase,
    query: { category_id, limit, offset, order },
  } = params;

  let dbQuery = supabase
    .from("flashcards")
    .select("id, category_id, front, back, source, created_at, updated_at")
    .order("created_at", { ascending: order === "created_asc" });

  if (category_id) {
    dbQuery = dbQuery.eq("category_id", category_id);
  }

  const { data, error } = await dbQuery.range(
    offset,
    offset + limit - 1,
  );

  if (error) {
    throw new Error(`Failed to list flashcards: ${error.message}`);
  }

  const items = (data ?? []) as FlashcardDTO[];

  const response: ListFlashcardsResponseDTO = {
    items,
    limit,
    offset,
    total: null,
  };

  return response;
}


