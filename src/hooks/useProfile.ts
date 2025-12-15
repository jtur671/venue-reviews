import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { userCache } from '@/lib/cache/userCache';
import type { CurrentUser } from './useCurrentUser';

export type UserRole = 'artist' | 'fan';

export type Profile = {
  id: string;
  display_name: string | null;
  role: UserRole | null;
};

// Allow both CurrentUser and simple { id: string } for anonymous users
type UserForProfile = CurrentUser | { id: string } | null;

export function useProfile(user: UserForProfile) {
  // Try to get cached profile immediately
  const cachedProfile = user ? userCache.getProfile(user.id) : null;
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile && !!user);

  useEffect(() => {
    if (!user) {
      // Use setTimeout to avoid calling setState synchronously in effect
      setTimeout(() => {
        setProfile(null);
        setLoading(false);
      }, 0);
      return;
    }

    let active = true;

    async function loadProfile() {
      if (!user) return;
      
      // Check if there's already a pending fetch
      const pending = userCache.getPendingProfileFetch(user.id);
      if (pending) {
        try {
          const cached = await pending;
          if (!active) return;
          // Strip cachedAt field
          setProfile(cached ? { id: cached.id, display_name: cached.display_name, role: cached.role } : null);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Error resolving pending profile fetch:', err);
          if (!active) return;
          setProfile(null);
          setLoading(false);
          return;
        }
      }

      // Create fetch promise
      const fetchPromise = (async () => {
        try {
          if (!user) return null;
          
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, role')
            .eq('id', user.id)
            .maybeSingle();

          if (error || !data) {
            // On first login, create profile
            const { data: insertData, error: insertError } = await supabase
              .from('profiles')
              .insert({ id: user.id, role: null })
              .select('id, display_name, role')
              .single();

            if (insertError) {
              console.error('Error creating profile:', insertError);
              userCache.setProfile(user.id, null);
              return null;
            }

            const profileData = insertData as Profile;
            userCache.setProfile(user.id, profileData);
            // Return as CachedProfile for type compatibility
            return {
              ...profileData,
              cachedAt: Date.now(),
            };
          }

          const profileData = data as Profile;
          userCache.setProfile(user.id, profileData);
          // Return as CachedProfile for type compatibility
          return {
            ...profileData,
            cachedAt: Date.now(),
          };
        } catch (err) {
          console.error('Error loading profile:', err);
          if (user) userCache.setProfile(user.id, null);
          return null;
        }
      })();

      userCache.setPendingProfileFetch(user.id, fetchPromise);

      try {
        const cachedProfile = await fetchPromise;
        if (!active) return;

        // Strip cachedAt field
        setProfile(cachedProfile ? { id: cachedProfile.id, display_name: cachedProfile.display_name, role: cachedProfile.role } : null);
        setLoading(false);
      } catch (err) {
        console.error('Error resolving profile fetch:', err);
        if (!active) return;
        setProfile(null);
        setLoading(false);
      }
    }

    // If we have cached data, still fetch fresh data in background
    loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  return { profile, loading };
}
