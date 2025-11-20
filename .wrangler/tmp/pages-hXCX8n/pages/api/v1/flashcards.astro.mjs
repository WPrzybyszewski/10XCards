globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createErrorResponse, a as createJsonResponse } from '../../../chunks/http_CyLw5LLr.mjs';
import { l as listFlashcardsQuerySchema } from '../../../chunks/flashcards_xOHMtYQ2.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_SvKBFpRS.mjs';

async function listFlashcards(params) {
  const {
    supabase,
    query: { category_id, limit, offset, order }
  } = params;
  let dbQuery = supabase.from("flashcards").select("id, category_id, front, back, source, created_at, updated_at").order("created_at", { ascending: order === "created_asc" });
  if (category_id) {
    dbQuery = dbQuery.eq("category_id", category_id);
  }
  const { data, error } = await dbQuery.range(
    offset,
    offset + limit - 1
  );
  if (error) {
    throw new Error(`Failed to list flashcards: ${error.message}`);
  }
  const items = data ?? [];
  const response = {
    items,
    limit,
    offset,
    total: null
  };
  return response;
}

async function GET(context) {
  const { locals, url } = context;
  const supabase = locals.supabase;
  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client not available."
    );
  }
  const searchParams = url.searchParams;
  const parseResult = listFlashcardsQuerySchema.safeParse({
    category_id: searchParams.get("category_id") ?? void 0,
    limit: searchParams.get("limit") ?? void 0,
    offset: searchParams.get("offset") ?? void 0,
    order: searchParams.get("order") ?? void 0
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
  const { category_id, limit, offset, order } = parseResult.data;
  const query = {
    category_id,
    limit,
    offset,
    order
  };
  try {
    const result = await listFlashcards({
      supabase,
      query
    });
    return createJsonResponse(200, result);
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/flashcards", error);
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong. Please try again later."
    );
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
