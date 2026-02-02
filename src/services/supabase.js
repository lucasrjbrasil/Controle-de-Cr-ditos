import { createClient } from '@supabase/supabase-js'

/**
 * @type {string|undefined}
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

/**
 * @type {string|undefined}
 */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Supabase client instance.
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
let supabaseInstance;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file and environment variables.')

  // Provide a dummy object that will fail gracefully instead of crashing the whole app import
  // This allows the app to start even if misconfigured, simplifying debugging
  /** @type {any} */
  const dummyClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
      signInWithPassword: async () => ({ data: { user: null }, error: new Error('Erro: VITE_SUPABASE_URL ou KEY não configurados no ambiente de publicação.') }),
      signUp: async () => ({ data: { user: null }, error: new Error('Erro: VITE_SUPABASE_URL ou KEY não configurados no ambiente de publicação.') }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    })
  };
  supabaseInstance = dummyClient;
} else {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = supabaseInstance;

