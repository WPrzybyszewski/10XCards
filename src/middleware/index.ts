import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerClient } from "../db/supabase.server";

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createSupabaseServerClient(context.cookies);
  context.locals.supabase = supabase;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    context.locals.session = session ?? null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load Supabase session in middleware", error);
    context.locals.session = null;
  }

  return next();
});

