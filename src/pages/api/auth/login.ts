import type { APIContext } from "astro";

import { createErrorResponse, createJsonResponse } from "@/lib/http";
import { loginCommandSchema } from "@/lib/validation/auth";

export async function POST(context: APIContext): Promise<Response> {
  const { request, locals } = context;
  const supabase = locals.supabase;

  if (!supabase) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Supabase client is not available.",
    );
  }

  let body: unknown;
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
      issues: parsed.error.issues,
    });
  }

  const { email, password } = parsed.data;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    const isInvalidCredentials =
      error?.message?.toLowerCase().includes("invalid login") ?? false;

    if (isInvalidCredentials) {
      return createErrorResponse(
        401,
        "Invalid Credentials",
        "Nieprawidłowy e-mail lub hasło.",
      );
    }

    return createErrorResponse(
      500,
      "Auth Provider Error",
      "Logowanie nie powiodło się. Spróbuj ponownie później.",
    );
  }

  return createJsonResponse(200, {
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}


