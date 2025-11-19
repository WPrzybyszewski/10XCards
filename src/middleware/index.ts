import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerClient } from "../db/supabase.server";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = createSupabaseServerClient(context.cookies);
  return next();
});

