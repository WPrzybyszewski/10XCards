globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createErrorResponse, a as createJsonResponse } from '../../../chunks/http_CyLw5LLr.mjs';
import { o as objectType, k as stringType } from '../../../chunks/astro/server_Df_JRoM_.mjs';
import { i as isFeatureEnabled } from '../../../chunks/featureFlags_Dfc6shOx.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_SvKBFpRS.mjs';

const createCategoryCommandSchema = objectType({
  name: stringType().transform((value) => value.trim()).refine(
    (value) => value.length >= 1 && value.length <= 100,
    "name must be between 1 and 100 characters after trimming."
  )
});
const listCategoriesQuerySchema = objectType({
  limit: stringType().nullable().optional().transform((value) => {
    if (value == null || value === "") {
      return 100;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return NaN;
    }
    return parsed;
  }).refine((value) => Number.isInteger(value) && value >= 1 && value <= 500, {
    message: "limit must be between 1 and 500.",
    path: ["limit"]
  }),
  offset: stringType().nullable().optional().transform((value) => {
    if (value == null || value === "") {
      return 0;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return NaN;
    }
    return parsed;
  }).refine((value) => Number.isInteger(value) && value >= 0, {
    message: "offset must be greater than or equal to 0.",
    path: ["offset"]
  })
}).transform(({ limit, offset }) => ({
  limit,
  offset
}));

class CategoryDomainError extends Error {
  type;
  details;
  constructor(type, message, details) {
    super(message);
    this.name = "CategoryDomainError";
    this.type = type;
    this.details = details;
  }
}
async function createCategory(context, command) {
  const { supabase, userId } = context;
  const trimmedName = command.name.trim();
  const { data, error } = await supabase.from("categories").insert({
    user_id: userId,
    name: trimmedName
  }).select("*").single();
  if (error) {
    if (error.code === "23505") {
      throw new CategoryDomainError(
        "Conflict",
        "Category with this name already exists.",
        {
          field: "name",
          name: trimmedName
        }
      );
    }
    throw new CategoryDomainError("Unknown", "Failed to create category.", {
      cause: error.message
    });
  }
  if (!data) {
    throw new CategoryDomainError("Unknown", "Failed to create category.", {
      cause: "No data returned from insert."
    });
  }
  return data;
}
async function listCategories(params) {
  const { supabase, limit, offset } = params;
  const { data, error } = await supabase.from("categories").select("id, name, created_at, updated_at").order("created_at", { ascending: true }).range(offset, offset + limit - 1);
  if (error) {
    throw new CategoryDomainError("Unknown", "Failed to list categories.", {
      cause: error.message
    });
  }
  return data ?? [];
}

async function GET(context) {
  const { locals, url } = context;
  const supabase = locals.supabase;
  if (!isFeatureEnabled("collections")) {
    return createErrorResponse(
      503,
      "Service Unavailable",
      "Moduł kolekcji jest tymczasowo wyłączony."
    );
  }
  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available."
    );
  }
  const searchParams = url.searchParams;
  const parseResult = listCategoriesQuerySchema.safeParse({
    limit: searchParams.get("limit"),
    offset: searchParams.get("offset")
  });
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse(
      400,
      "Bad Request",
      firstIssue.message,
      {
        field: firstIssue.path.join("."),
        issues: parseResult.error.issues
      }
    );
  }
  const { limit, offset } = parseResult.data;
  try {
    const items = await listCategories({
      supabase,
      limit,
      offset
    });
    const response = {
      items,
      limit,
      offset,
      total: null
    };
    return createJsonResponse(200, response);
  } catch (error) {
    if (error instanceof CategoryDomainError) {
      console.error(
        "Domain error in GET /api/v1/categories",
        error
      );
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Something went wrong. Please try again later."
      );
    }
    console.error("Unexpected error in GET /api/v1/categories", error);
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later."
    );
  }
}
async function POST(context) {
  const { request, locals } = context;
  const supabase = locals.supabase;
  if (!isFeatureEnabled("collections")) {
    return createErrorResponse(
      503,
      "Service Unavailable",
      "Moduł kolekcji jest tymczasowo wyłączony."
    );
  }
  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available."
    );
  }
  const userId = "11111111-1111-1111-1111-111111111111";
  let jsonBody;
  try {
    jsonBody = await request.json();
  } catch {
    return createErrorResponse(
      400,
      "Bad Request",
      "Invalid JSON body."
    );
  }
  const parseResult = createCategoryCommandSchema.safeParse(jsonBody);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse(
      400,
      "Bad Request",
      firstIssue.message,
      {
        field: firstIssue.path.join("."),
        issues: parseResult.error.issues
      }
    );
  }
  const { name } = parseResult.data;
  const command = {
    name
  };
  try {
    const categoryEntity = await createCategory(
      {
        supabase,
        userId
      },
      command
    );
    const { user_id, ...categoryDto } = categoryEntity;
    return createJsonResponse(201, categoryDto);
  } catch (error) {
    if (error instanceof CategoryDomainError) {
      switch (error.type) {
        case "Conflict":
          return createErrorResponse(
            409,
            "Conflict",
            error.message,
            error.details
          );
        case "Unknown":
        default:
          console.error(
            "Unknown domain error in POST /api/v1/categories",
            error
          );
          return createErrorResponse(
            500,
            "Internal Server Error",
            "Something went wrong. Please try again later."
          );
      }
    }
    console.error(
      "Unexpected error in POST /api/v1/categories",
      error
    );
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later."
    );
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
