import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type AnonUser = { id: string } | null;

let cachedAnonUser: AnonUser = null;
let pendingEnsure: Promise<AnonUser> | null = null;

async function ensureAnonUserSingleton(): Promise<AnonUser> {
  if (cachedAnonUser) return cachedAnonUser;
  if (pendingEnsure) return pendingEnsure;

  pendingEnsure = (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        cachedAnonUser = { id: data.user.id };
        return cachedAnonUser;
      }

      const { data: anonData, error } = await supabase.auth.signInAnonymously();
      if (!error && anonData.user) {
        cachedAnonUser = { id: anonData.user.id };
        return cachedAnonUser;
      }

      console.error('Anonymous sign-in failed:', error);
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
