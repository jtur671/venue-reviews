import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseEnv = {
  url?: string;
  anonKey?: string;
};

function readSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseConfigError(env: SupabaseEnv = readSupabaseEnv()): string | null {
  if (!env.url || !env.anonKey) {
    return 'Supabase is not configured. Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY.';
  }
  return null;
}

export function isSupabaseConfigured(env: SupabaseEnv = readSupabaseEnv()): boolean {
  return getSupabaseConfigError(env) === null;
}

let cachedClient: SupabaseClient | null = null;
let cachedClientKey: string | null = null;

function getOrCreateClient(): SupabaseClient {
  const env = readSupabaseEnv();
  const error = getSupabaseConfigError(env);
  if (error) throw new Error(error);

  const clientKey = `${env.url}|${env.anonKey}`;
  if (!cachedClient || cachedClientKey !== clientKey) {
    cachedClient = createClient(env.url!, env.anonKey!);
    cachedClientKey = clientKey;
  }
  return cachedClient;
}

/**
 * Proxy wrapper so:
 * - we don't crash the whole app at import-time if env vars are missing
 * - tests can mutate process.env at runtime and still get a real client
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getOrCreateClient();
    const value = (client as any)[prop];
    // Ensure client methods keep their `this` binding
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
