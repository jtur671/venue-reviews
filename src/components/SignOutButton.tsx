'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="btn btn--ghost"
      style={{ fontSize: '0.85rem' }}
    >
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
