import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type AnonUser = { id: string } | null;

let cachedAnonUser: AnonUser = null;
let pendingEnsure: Promise<AnonUser> | null = null;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout (${ms}ms) waiting for ${label}`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function ensureAnonUserSingleton(): Promise<AnonUser> {
  if (cachedAnonUser) return cachedAnonUser;
  if (pendingEnsure) return pendingEnsure;

  pendingEnsure = (async () => {
    try {
      // 1) Try existing session first (short timeout).
      try {
        const { data } = await withTimeout(supabase.auth.getUser(), 8_000, 'supabase.auth.getUser()');
        if (data.user) {
          cachedAnonUser = { id: data.user.id };
          return cachedAnonUser;
        }
      } catch (err) {
        // Non-fatal: we can still try anonymous sign-in.
        console.warn('Anonymous getUser timed out/failed:', err);
      }

      // 2) Create an anonymous session, with retries/backoff to avoid rare flakes.
      const delaysMs = [0, 500, 1500];
      for (let attempt = 0; attempt < delaysMs.length; attempt++) {
        if (attempt > 0) await sleep(delaysMs[attempt]);

        try {
          const { data: anonData, error } = await withTimeout(
            supabase.auth.signInAnonymously(),
            15_000,
            'supabase.auth.signInAnonymously()'
          );

          if (!error && anonData.user) {
            cachedAnonUser = { id: anonData.user.id };
            return cachedAnonUser;
          }

          if (error) {
            console.warn('Anonymous sign-in failed:', error);
          }
        } catch (err) {
          console.warn('Error signing in anonymously:', err);
        }

        // Sometimes the session is established even if the call path is flaky; re-check.
        try {
          const { data } = await withTimeout(supabase.auth.getUser(), 8_000, 'supabase.auth.getUser() after anon sign-in');
          if (data.user) {
            cachedAnonUser = { id: data.user.id };
            return cachedAnonUser;
          }
        } catch (err) {
          console.warn('Anonymous getUser retry timed out/failed:', err);
        }
      }

      cachedAnonUser = null;
      return null;
    } catch (err) {
      console.error('Error ensuring anonymous user:', err);
      cachedAnonUser = null;
      return null;
    } finally {
      pendingEnsure = null;
    }
  })();

  return pendingEnsure;
}

// Testing helper (unit tests should reset singleton state).
export function __resetAnonUserForTests() {
  cachedAnonUser = null;
  pendingEnsure = null;
}

export function useAnonUser() {
  const [user, setUser] = useState<AnonUser>(cachedAnonUser);
  const [loading, setLoading] = useState(!cachedAnonUser);

  useEffect(() => {
    let active = true;

    async function ensureUser() {
      const ensured = await ensureAnonUserSingleton();
      if (!active) return;
      setUser(ensured);
      setLoading(false);
    }

    ensureUser();

    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}
