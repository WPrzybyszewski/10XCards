import type {
  CreateFlashcardCommand,
  CreateFlashcardResponseDTO,
  FlashcardDTO,
  ListFlashcardsQueryDTO,
  ListFlashcardsResponseDTO,
  UpdateFlashcardCommand,
  UpdateFlashcardResponseDTO,
} from "@/types";
import type { SupabaseClient } from "@/db/supabase.client";

const RANDOM_CANDIDATE_LIMIT = 100;

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

export interface CreateFlashcardParams {
  supabase: SupabaseClient;
  userId: string;
  command: CreateFlashcardCommand;
}

/**
 * Serwis domenowy do ręcznego tworzenia fiszek przez użytkownika.
 */
export async function createFlashcard(
  params: CreateFlashcardParams,
): Promise<CreateFlashcardResponseDTO> {
  const { supabase, userId, command } = params;
  const { category_id, front, back } = command;

  const { data, error } = await supabase
    .from("flashcards")
    .insert({
      user_id: userId,
      category_id,
      front,
      back,
      source: "manual",
    })
    .select("id, category_id, front, back, source, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Failed to create flashcard: ${error.message}`);
  }

  return data as CreateFlashcardResponseDTO;
}

export interface DeleteFlashcardParams {
  supabase: SupabaseClient;
  userId: string;
  id: string;
}

/**
 * Usuwa pojedynczą fiszkę użytkownika. Zwraca true, gdy rekord został usunięty.
 */
export async function deleteFlashcard(
  params: DeleteFlashcardParams,
): Promise<boolean> {
  const { supabase, id } = params;

  const { data, error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to delete flashcard: ${error.message}`);
  }

  return data != null;
}

export interface UpdateFlashcardParams {
  supabase: SupabaseClient;
  userId: string;
  id: string;
  command: UpdateFlashcardCommand;
}

/**
 * Aktualizuje wskazaną fiszkę użytkownika i zwraca odświeżone DTO.
 */
export async function updateFlashcard(
  params: UpdateFlashcardParams,
): Promise<UpdateFlashcardResponseDTO | null> {
  const { supabase, id, command } = params;

  const updatePayload: Record<string, unknown> = {};

  if (command.category_id !== undefined) {
    updatePayload.category_id = command.category_id;
  }

  if (command.front !== undefined) {
    updatePayload.front = command.front;
  }

  if (command.back !== undefined) {
    updatePayload.back = command.back;
  }

  if (Object.keys(updatePayload).length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("flashcards")
    .update(updatePayload)
    .eq("id", id)
    .select("id, category_id, front, back, source, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update flashcard: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as UpdateFlashcardResponseDTO;
}

export interface GetRandomFlashcardParams {
  supabase: SupabaseClient;
  userId: string;
  categoryId?: string;
}

/**
 * Pobiera losową fiszkę użytkownika (opcjonalnie z konkretnej kategorii).
 */
export async function getRandomFlashcard(
  params: GetRandomFlashcardParams,
): Promise<FlashcardDTO | null> {
  const { supabase, userId, categoryId } = params;

  let query = supabase
    .from("flashcards")
    .select("id, category_id, front, back, source, created_at, updated_at")
    .eq("user_id", userId);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query.limit(RANDOM_CANDIDATE_LIMIT);

  if (error) {
    throw new Error(`Failed to load random flashcards: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * data.length);
  return data[index] as FlashcardDTO;
}


