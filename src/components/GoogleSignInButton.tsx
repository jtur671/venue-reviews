'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
    if (error) {
      console.error('Error signing in with Google:', error);
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={loading}
      className="btn btn--ghost"
      style={{ fontSize: '0.85rem' }}
    >
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}
