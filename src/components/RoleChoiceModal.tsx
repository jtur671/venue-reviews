'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { userCache } from '@/lib/cache/userCache';

type UserRole = 'artist' | 'fan';

type Props = {
  profileId: string;
  initialRole: UserRole | null;
  onRoleSet: (role: UserRole) => void;
};

export function RoleChoiceModal({ profileId, initialRole, onRoleSet }: Props) {
  // Only show modal if role is null (immutable once set)
  // Use state to track if modal should be shown - once shown, keep it open until role is selected
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleSelected, setRoleSelected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize: if role is null, show the modal
  useEffect(() => {
    if (initialRole === null && !roleSelected) {
      setTimeout(() => {
        setOpen(true);
      }, 0);
    } else if (initialRole !== null) {
      // Role is set - close the modal
      setTimeout(() => {
        setOpen(false);
      }, 0);
    }
  }, [initialRole, roleSelected]);

  // Don't show if role is already set (immutable) or if user has selected a role
  if (roleSelected || initialRole !== null || !open) {
    return null;
  }

  async function chooseRole(role: UserRole) {
    setSaving(true);
    setError(null);
    
    try {
      // Add timeout wrapper to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      // Our DB enforces profiles.role NOT NULL, so "no role yet" means "no profile row yet".
      // Create the profile row with the chosen role; if it already exists, do not overwrite (immutable).
      const upsertPromise = supabase
        .from('profiles')
        .upsert({ id: profileId, role }, { onConflict: 'id', ignoreDuplicates: true });

      const { error: upsertError } = await Promise.race([upsertPromise, timeoutPromise]) as any;

      if (upsertError) {
        console.error('Error setting role (profile upsert):', upsertError);
        setSaving(false);
        setError('Could not save your role. Please try again.');
        return;
      }

      // Fetch the stored role so we don't lie if the row already existed.
      const fetchPromise = supabase
        .from('profiles')
        .select('id, display_name, role')
        .eq('id', profileId)
        .single();
      
      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (fetchError || !data) {
        console.error('Error loading profile after role set:', fetchError);
        setSaving(false);
        setError('Could not load your profile. Please refresh the page.');
        return;
      }
      
      // Mark that role has been selected - this prevents modal from reopening
      setRoleSelected(true);
      setSaving(false);
      
      // Update cache
      userCache.setProfile(profileId, {
        id: data.id,
        display_name: data.display_name ?? null,
        role: data.role,
      });
      
      onRoleSet(data.role);
      // Notify Header (and any listeners) to refresh role display.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      }
      setOpen(false);
    } catch (err) {
      // Catch any unexpected errors to prevent stuck "Saving..." state
      console.error('Unexpected error in chooseRole:', err);
      setSaving(false);
      const errorMessage = err instanceof Error && err.message === 'Request timeout'
        ? 'Request timed out. Please check your connection and try again.'
        : 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
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
