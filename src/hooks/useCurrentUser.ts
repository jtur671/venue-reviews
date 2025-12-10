import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { userCache } from '@/lib/cache/userCache';

export type CurrentUser = {
  id: string;
  email?: string;
};

export function useCurrentUser() {
  // Try to get cached user immediately for instant render
  const cachedUser = userCache.getUser();
  const [user, setUser] = useState<CurrentUser | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser); // If we have cache, we're not loading

  useEffect(() => {
    let active = true;

    async function loadUser() {
      // Check if there's already a pending fetch
      const pending = userCache.getPendingUserFetch();
      if (pending) {
        const cached = await pending;
        if (!active) return;
        // Strip cachedAt field
        setUser(cached ? { id: cached.id, email: cached.email } : null);
        setLoading(false);
        return;
      }

      // Create fetch promise
      const fetchPromise = (async () => {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          userCache.setUser(null);
          return null;
        }

        const userData: CurrentUser = {
          id: data.user.id,
          email: data.user.email ?? undefined,
        };

        userCache.setUser(userData);
        // Return as CachedUser for type compatibility
        return {
          id: userData.id,
          email: userData.email,
          cachedAt: Date.now(),
        };
      })();

      userCache.setPendingUserFetch(fetchPromise);

      const cachedUser = await fetchPromise;
      if (!active) return;

      // Strip cachedAt field
      setUser(cachedUser ? { id: cachedUser.id, email: cachedUser.email } : null);
      setLoading(false);
    }

    // If we have cached data, still fetch fresh data in background (stale-while-revalidate)
    loadUser();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      
      if (session?.user) {
        const userData: CurrentUser = {
          id: session.user.id,
          email: session.user.email ?? undefined,
        };
        userCache.setUser(userData);
        setUser(userData);
      } else {
        userCache.setUser(null);
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
