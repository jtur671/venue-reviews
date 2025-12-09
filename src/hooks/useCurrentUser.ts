import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type CurrentUser = {
  id: string;
  email?: string;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? undefined });
      } else {
        setUser(null);
      }
      setLoading(false);
    })();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? undefined });
      } else {
        setUser(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
