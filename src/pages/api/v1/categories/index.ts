import type { APIContext } from "astro";

import { createErrorResponse, createJsonResponse } from "@/lib/http";
import {
  createCategoryCommandSchema,
  listCategoriesQuerySchema,
} from "@/lib/validation/categories";
import {
  CategoryDomainError,
  createCategory,
  listCategories,
} from "@/lib/services/categoryService";
import type {
  CategoryDTO,
  CreateCategoryCommand,
  ListCategoriesResponseDTO,
} from "@/types";
import { isFeatureEnabled } from "@/features/featureFlags";

/**
 * Handler endpointu GET /api/v1/categories.
 *
 * W wersji deweloperskiej pomijamy rzeczywistą autoryzację tokenem
 * i opieramy się na RLS + wcześniej skonfigurowanym Supabase client.
 */
export async function GET(context: APIContext): Promise<Response> {
  const { locals, url } = context;
  const supabase = locals.supabase;

  if (!isFeatureEnabled("collections")) {
    return createErrorResponse(
      503,
      "Service Unavailable",
      "Moduł kolekcji jest tymczasowo wyłączony.",
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

  const parseResult = listCategoriesQuerySchema.safeParse({
    limit: searchParams.get("limit"),
    offset: searchParams.get("offset"),
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

  const { limit, offset } = parseResult.data;

  try {
    const items = await listCategories({
      supabase,
      limit,
      offset,
    });

    const response: ListCategoriesResponseDTO = {
      items,
      limit,
      offset,
      total: null,
    };

    return createJsonResponse(200, response);
  } catch (error) {
    if (error instanceof CategoryDomainError) {
      // Obecnie używamy tylko typu "Unknown" dla listowania.
      // eslint-disable-next-line no-console
      console.error(
        "Domain error in GET /api/v1/categories",
        error,
      );

      return createErrorResponse(
        500,
        "Internal Server Error",
        "Something went wrong. Please try again later.",
      );
    }

    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/v1/categories", error);

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later.",
    );
  }
}

/**
 * Handler endpointu POST /api/v1/categories.
 *
 * W wersji deweloperskiej korzysta z „na sztywno” ustawionego userId,
 * aby uprościć testowanie bez pełnej autoryzacji. Docelowo należy tu
 * przywrócić pobieranie użytkownika z Supabase Auth.
 */
export async function POST(context: APIContext): Promise<Response> {
  const { request, locals } = context;
  const supabase = locals.supabase;

  if (!isFeatureEnabled("collections")) {
    return createErrorResponse(
      503,
      "Service Unavailable",
      "Moduł kolekcji jest tymczasowo wyłączony.",
    );
  }

  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available.",
    );
  }

  // Użytkownik „na sztywno” na potrzeby dev (bez pełnej autoryzacji).
  const userId = "11111111-1111-1111-1111-111111111111";

  // 1. Odczyt body JSON.
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

  // 2. Walidacja za pomocą Zod.
  const parseResult = createCategoryCommandSchema.safeParse(jsonBody);

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

  const { name } = parseResult.data;

  const command: CreateCategoryCommand = {
    name,
  };

  // 3. Logika domenowa + mapowanie błędów na HTTP.
  try {
    const categoryEntity = await createCategory(
      {
        supabase,
        userId,
      },
      command,
    );

    // Mapowanie na DTO (bez user_id).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_id, ...categoryDto } = categoryEntity;

    return createJsonResponse(201, categoryDto as CategoryDTO);
  } catch (error) {
    if (error instanceof CategoryDomainError) {
      switch (error.type) {
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
            "Unknown domain error in POST /api/v1/categories",
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
      "Unexpected error in POST /api/v1/categories",
      error,
    );

    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later.",
    );
  }
}


