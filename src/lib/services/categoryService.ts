import type {
  CategoryDTO,
  CategoryEntity,
  CreateCategoryCommand,
} from "@/types";
import type { SupabaseClient } from "@/db/supabase.client";

type CategoryDomainErrorType = "Conflict" | "Unknown";

/**
 * Kontrolowany błąd domenowy dla operacji na kategoriach.
 * Umożliwia mapowanie na odpowiednie kody HTTP w handlerze API.
 */
export class CategoryDomainError extends Error {
  readonly type: CategoryDomainErrorType;

  readonly details?: Record<string, unknown>;

  constructor(
    type: CategoryDomainErrorType,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CategoryDomainError";
    this.type = type;
    this.details = details;
  }
}

export interface CreateCategoryContext {
  supabase: SupabaseClient;
  userId: string;
}

export interface ListCategoriesParams {
  supabase: SupabaseClient;
  limit: number;
  offset: number;
}

/**
 * Serwis domenowy dla tworzenia kategorii.
 *
 * Zgodnie z planem:
 * - trimuje nazwę,
 * - tworzy rekord w tabeli `categories`,
 * - mapuje naruszenie unikalności (user_id, name) na błąd typu Conflict.
 */
export async function createCategory(
  context: CreateCategoryContext,
  command: CreateCategoryCommand,
): Promise<CategoryEntity> {
  const { supabase, userId } = context;
  const trimmedName = command.name.trim();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: trimmedName,
    })
    .select("*")
    .single<CategoryEntity>();

  if (error) {
    // 23505 – unique_violation (np. constraint categories_user_id_name_key)
    if (error.code === "23505") {
      throw new CategoryDomainError(
        "Conflict",
        "Category with this name already exists.",
        {
          field: "name",
          name: trimmedName,
        },
      );
    }

    throw new CategoryDomainError("Unknown", "Failed to create category.", {
      cause: error.message,
    });
  }

  if (!data) {
    throw new CategoryDomainError("Unknown", "Failed to create category.", {
      cause: "No data returned from insert.",
    });
  }

  return data;
}

/**
 * Serwis domenowy dla listowania kategorii.
 *
 * Zgodnie z planem:
 * - zwraca kategorie bieżącego użytkownika (RLS w bazie),
 * - stosuje paginację (limit, offset),
 * - nie wylicza total (w MVP zawsze null po stronie endpointu).
 */
export async function listCategories(
  params: ListCategoriesParams,
): Promise<CategoryDTO[]> {
  const { supabase, limit, offset } = params;

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, created_at, updated_at")
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new CategoryDomainError("Unknown", "Failed to list categories.", {
      cause: error.message,
    });
  }

  return (data ?? []) as CategoryDTO[];
}


