'use client';

import { useEffect, useState } from 'react';
import { getStoredRole, setStoredRoleOnce, type StoredRole } from '@/lib/roleStorage';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  userId: string;
  onRoleSet?: (role: StoredRole) => void;
};

export function LocalRoleChoiceModal({ userId, onRoleSet }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = getStoredRole(userId);
    if (!existing) {
      setTimeout(() => setOpen(true), 0);
    } else {
      setTimeout(() => setOpen(false), 0);
    }
  }, [userId]);

  if (!open) return null;

  async function chooseRole(role: StoredRole) {
    setSaving(true);
    setError(null);

    try {
      // 1) Create profile row with role (required by DB before reviews can be inserted).
      //    Immutable: do not overwrite if it already exists.
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: userId, role }, { onConflict: 'id', ignoreDuplicates: true });

      if (upsertError) {
        console.error('Error creating profile with role:', upsertError);
        setSaving(false);
        setError('Could not save your role. Please try again.');
        return;
      }

      // 2) Store local role for fast UI (immutable unless storage cleared).
      //    Even if profile existed already, store the true role from DB to keep UI consistent.
      //    Use the role we just set if the fetch fails (graceful degradation).
      let finalRole = role;
      try {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (profileRow?.role === 'artist' || profileRow?.role === 'fan') {
          finalRole = profileRow.role;
        }
      } catch (fetchError) {
        // Non-fatal: use the role we just set
        console.warn('Could not fetch profile after upsert, using selected role:', fetchError);
      }

      setStoredRoleOnce(userId, finalRole);

      setSaving(false);
      onRoleSet?.(finalRole);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      }
      setOpen(false);
    } catch (err) {
      // Catch any unexpected errors to prevent stuck "Saving..." state
      console.error('Unexpected error in chooseRole:', err);
      setSaving(false);
      setError('An unexpected error occurred. Please try again.');
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>
          How do you use venues?
        </h2>
        <p className="section-subtitle" style={{ marginBottom: '1rem' }}>
          We use this once to separate <strong>artist</strong> scores from <strong>fan</strong> scores. You
          won&apos;t be able to change it yourself later.
        </p>
        {error && (
          <p className="form-error" style={{ marginBottom: '0.75rem' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() => chooseRole('artist')}
            style={{ width: '100%' }}
          >
            {saving ? 'Saving...' : "I'm an Artist / Band"}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() => chooseRole('fan')}
            style={{ width: '100%' }}
          >
            {saving ? 'Saving...' : "I'm a Fan / Attendee"}
          </button>
        </div>
      </div>
    </div>
  );
}

