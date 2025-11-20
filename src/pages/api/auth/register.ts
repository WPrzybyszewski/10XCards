import type { APIContext } from "astro";

import { createErrorResponse, createJsonResponse } from "@/lib/http";
import { registerCommandSchema } from "@/lib/validation/auth";
import { isFeatureEnabled } from "@/features/featureFlags";

export async function POST(context: APIContext): Promise<Response> {
  const { request, locals } = context;
  const supabase = locals.supabase;

  if (!isFeatureEnabled("auth")) {
    return createErrorResponse(
      503,
      "Service Unavailable",
      "Rejestracja jest tymczasowo niedostępna.",
    );
  }

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

  const parsed = registerCommandSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return createErrorResponse(400, "Validation Error", firstIssue.message, {
      field: firstIssue.path.join("."),
      issues: parsed.error.issues,
    });
  }

  const { email, password } = parsed.data;

  const redirectUrl = new URL("/auth/login", request.url);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl.toString(),
    },
  });

  if (error) {
    const message = error.message.toLowerCase();

    if (message.includes("already registered")) {
      return createErrorResponse(
        409,
        "Email Already Registered",
        "Konto z tym adresem e-mail już istnieje.",
      );
    }

    return createErrorResponse(
      500,
      "Auth Provider Error",
      "Rejestracja nie powiodła się. Spróbuj ponownie później.",
    );
  }

  return createJsonResponse(201, {
    message:
      "Konto zostało utworzone. Sprawdź skrzynkę e-mail i kliknij link aktywacyjny, aby dokończyć rejestrację.",
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  });
}


