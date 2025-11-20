globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createErrorResponse, a as createJsonResponse } from '../../../chunks/http_CyLw5LLr.mjs';
import { l as loginCommandSchema } from '../../../chunks/auth_D6mgL0WL.mjs';
import { i as isFeatureEnabled } from '../../../chunks/featureFlags_Dfc6shOx.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_SvKBFpRS.mjs';

async function POST(context) {
  const { request, locals } = context;
  const supabase = locals.supabase;
  if (!isFeatureEnabled("auth")) {
    return createErrorResponse(
      503,
      "Service Unavailable",
      "Logowanie jest tymczasowo niedostępne."
    );
  }
  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client is not available."
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, "Bad Request", "Invalid JSON body.");
  }
  const parsed = loginCommandSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return createErrorResponse(400, "Validation Error", firstIssue.message, {
      field: firstIssue.path.join("."),
      issues: parsed.error.issues
    });
  }
  const { email, password } = parsed.data;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error || !data.user) {
    const isInvalidCredentials = error?.message?.toLowerCase().includes("invalid login") ?? false;
    if (isInvalidCredentials) {
      return createErrorResponse(
        401,
        "Invalid Credentials",
        "Nieprawidłowy e-mail lub hasło."
      );
    }
    return createErrorResponse(
      500,
      "Auth Provider Error",
      "Logowanie nie powiodło się. Spróbuj ponownie później."
    );
  }
  return createJsonResponse(200, {
    user: {
      id: data.user.id,
      email: data.user.email
    }
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
