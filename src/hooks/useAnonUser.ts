import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type AnonUser = { id: string } | null;

export function useAnonUser() {
  const [user, setUser] = useState<AnonUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function ensureUser() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!active) return;

        if (data.user) {
          setUser({ id: data.user.id });
          setLoading(false);
          return;
        }

        const { data: anonData, error } = await supabase.auth.signInAnonymously();
        if (!active) return;

        if (!error && anonData.user) {
          setUser({ id: anonData.user.id });
        } else {
          console.error('Anonymous sign-in failed:', error);
          setUser(null);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error ensuring anonymous user:', err);
        if (!active) return;
        setUser(null);
        setLoading(false);
      }
    }

    ensureUser();

    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}
