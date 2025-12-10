import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { CurrentUser } from './useCurrentUser';

export type UserRole = 'artist' | 'fan';

export type Profile = {
  id: string;
  display_name: string | null;
  role: UserRole | null;
};

export function useProfile(user: CurrentUser | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        // On first login, create profile
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, role: null })
          .select('id, display_name, role')
          .single();

        if (!active) return;

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setProfile(null);
        } else {
          setProfile(insertData ?? null);
        }
      } else {
        setProfile(data);
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  return { profile, loading };
}
