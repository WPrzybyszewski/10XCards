import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is not set in environment variables');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_KEY is not set in environment variables');
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Ujednolicony typ klienta Supabase używany w całej aplikacji.
// Zgodnie z regułami projektu, importujemy SupabaseClient z tego pliku,
// a nie bezpośrednio z `@supabase/supabase-js`.
export type SupabaseClient = typeof supabaseClient;
