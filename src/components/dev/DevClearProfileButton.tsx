'use client';

import { supabase } from '@/lib/supabaseClient';
import { userCache } from '@/lib/cache/userCache';
import { clearAllStoredRoles } from '@/lib/roleStorage';

export function DevClearProfileButton() {
  async function handleClearProfileDevOnly() {
    const ok = confirm(
      'Clear local profile + role and reset session?\n\nThis is a temporary dev tool. It will:\n- clear cached user/profile\n- clear stored Artist/Fan role\n- sign out (including anonymous)\n- reload the page'
    );
    if (!ok) return;

    try {
      // Best-effort: delete this user's reviews + profile from Supabase first.
      // (Helps you retest flows cleanly.) This may be restricted by RLS in some setups.
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;
      if (userId) {
        await supabase.from('reviews').delete().eq('user_id', userId);
        await supabase.from('profiles').delete().eq('id', userId);
      }

      // Clear role + caches first (works even if signOut fails).
      clearAllStoredRoles();
      userCache.clear();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Dev clear profile failed:', err);
    } finally {
      window.location.href = '/';
    }
  }

  // Never render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={handleClearProfileDevOnly}
      style={{ fontSize: '0.8rem', paddingInline: '0.8rem' }}
      title="Dev-only: clears cached profile + stored role"
    >
      Clear profile
    </button>
  );
}
