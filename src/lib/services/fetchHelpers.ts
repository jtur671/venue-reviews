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

export type ApiOptions = {
  errorMessage?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
};

type ApiResponse<T> = { data?: T; error?: string; code?: string; isDuplicate?: boolean; success?: boolean };

/**
 * Fetches data from an API route with standard error handling.
 * Returns { data, error } to match Supabase's response shape.
 * Supports GET, POST, PUT, DELETE methods.
 */
export async function fetchFromApi<T>(
  url: string,
  options: ApiOptions = {}
): Promise<{ data: T | null; error: { message: string; code?: string; isDuplicate?: boolean } | null }> {
  const { errorMessage = 'Request failed', method = 'GET', body } = options;
  
  try {
    const fetchOptions: RequestInit = {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    };

    const res = await fetch(url, fetchOptions);
    const resBody = (await res.json().catch(() => null)) as ApiResponse<T> | null;

    if (!res.ok) {
      return {
        data: null,
        error: { 
          message: resBody?.error || errorMessage,
          code: resBody?.code,
          isDuplicate: resBody?.isDuplicate,
        },
      };
    }

    return { data: resBody?.data ?? null, error: null };
  } catch (err) {
    console.error(`Error fetching ${url}:`, err);
    return {
      data: null,
      error: { message: errorMessage },
    };
  }
}

/**
 * Makes a DELETE request to an API route.
 * Returns { error } only (no data expected).
 */
export async function deleteFromApi(
  url: string,
  options: { errorMessage?: string } = {}
): Promise<{ error: { message: string } | null }> {
  const { errorMessage = 'Delete failed' } = options;
  
  try {
    const res = await fetch(url, { method: 'DELETE' });
    const resBody = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;

    if (!res.ok) {
      return {
        error: { message: resBody?.error || errorMessage },
      };
    }

    return { error: null };
  } catch (err) {
    console.error(`Error deleting ${url}:`, err);
    return {
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

