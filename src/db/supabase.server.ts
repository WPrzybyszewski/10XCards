import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
// Prefer the public key name but keep backward compatibility with SUPABASE_KEY.
const supabaseAnonKey =
  import.meta.env.SUPABASE_PUBLIC_KEY ?? import.meta.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not set in environment variables");
}

if (!supabaseAnonKey) {
  throw new Error(
    "SUPABASE_PUBLIC_KEY (or SUPABASE_KEY) is not set in environment variables",
  );
}

export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {

    cookies: {
      get: (name) => cookies.get(name)?.value,
      set: (name, value, options) => {
        cookies.set(name, value, {
          path: "/",
          sameSite: "lax",
          secure: true,
          ...options,
        });
      },
      remove: (name, options) => {
        cookies.delete(name, {
          path: "/",
          sameSite: "lax",
          secure: true,
          ...options,
        });
      },
    },
  });
}


