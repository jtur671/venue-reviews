/**
 * Shared helpers for service layer fetch logic.
 * 
 * These helpers centralize the "use API in browser, Supabase in SSR/tests" pattern
 * to avoid duplication and make it easier to test both paths.
 */

/**
 * Determines if we should use the API route (browser) or direct Supabase (SSR/tests).
 * 
 * Browser → API routes (avoids Supabase client auth timeout issues)
 * SSR/Tests → Direct Supabase (relative URLs don't work, tests mock Supabase)
 */
export function shouldUseApiRoute(): boolean {
  // Tests always use Supabase directly (they mock it)
  if (process.env.NODE_ENV === 'test') return false;
  
  // SSR uses Supabase directly (relative fetch URLs don't work)
  if (typeof window === 'undefined') return false;
  
  // Browser uses API routes
  return true;
}

/**
 * Fetches data from an API route with standard error handling.
 * Returns { data, error } to match Supabase's response shape.
 */
export async function fetchFromApi<T>(
  url: string,
  options: { errorMessage?: string } = {}
): Promise<{ data: T | null; error: { message: string } | null }> {
  const { errorMessage = 'Request failed' } = options;
  
  try {
    const res = await fetch(url, { method: 'GET' });
    const body = (await res.json().catch(() => null)) as { data?: T; error?: string } | null;

    if (!res.ok) {
      return {
        data: null,
        error: { message: body?.error || errorMessage },
      };
    }

    return { data: body?.data ?? null, error: null };
  } catch (err) {
    console.error(`Error fetching ${url}:`, err);
    return {
      data: null,
      error: { message: errorMessage },
    };
  }
}

// For testing: allow overriding the environment detection
let forceApiRoute: boolean | null = null;

export function __setForceApiRouteForTests(value: boolean | null) {
  forceApiRoute = value;
}

export function __shouldUseApiRouteInternal(): boolean {
  if (forceApiRoute !== null) return forceApiRoute;
  return shouldUseApiRoute();
}

