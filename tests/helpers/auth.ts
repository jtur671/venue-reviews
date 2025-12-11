/**
 * Shared authentication helper for tests
 * Reuses sessions to avoid rate limiting
 */

import { supabase } from '@/lib/supabaseClient';

let sharedTestUserId: string | null = null;
let sharedSessionPromise: Promise<string | null> | null = null;

/**
 * Get or create a shared test user session
 * Reuses the same session across all tests to avoid rate limits
 */
export async function getSharedTestUser(): Promise<string | null> {
  // If we already have a user ID, return it
  if (sharedTestUserId) {
    // Verify session is still valid
    const { data: user } = await supabase.auth.getUser();
    if (user?.user?.id === sharedTestUserId) {
      return sharedTestUserId;
    }
    // Session expired, reset
    sharedTestUserId = null;
  }

  // If there's already a request in progress, wait for it
  if (sharedSessionPromise) {
    return sharedSessionPromise;
  }

  // Create new session with retry logic
  sharedSessionPromise = (async () => {
    // First, check if we already have a valid session
    const { data: existingUser } = await supabase.auth.getUser();
    if (existingUser?.user) {
      sharedTestUserId = existingUser.user.id;
      sharedSessionPromise = null;
      return sharedTestUserId;
    }

    // Try to create new session with exponential backoff
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        if (authError.message?.includes('rate limit')) {
          if (retries > 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            retries--;
            continue;
          } else {
            // All retries failed
            sharedSessionPromise = null;
            return null;
          }
        } else {
          sharedSessionPromise = null;
          throw new Error(`Failed to create test user: ${authError.message}`);
        }
      }

      if (authData?.user) {
        sharedTestUserId = authData.user.id;
        sharedSessionPromise = null;
        return sharedTestUserId;
      }

      retries--;
    }

    sharedSessionPromise = null;
    return null;
  })();

  return sharedSessionPromise;
}

/**
 * Clear the shared session (for cleanup)
 */
export function clearSharedTestUser(): void {
  sharedTestUserId = null;
  sharedSessionPromise = null;
  try {
    const { unlinkSync, existsSync } = require('fs');
    const { join } = require('path');
    const SESSION_FILE = join(process.cwd(), '.test-session-id');
    const LOCK_FILE = join(process.cwd(), '.test-session-lock');
    if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE);
    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
  } catch {
    // Ignore cleanup errors
  }
}
