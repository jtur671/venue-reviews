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
    
    // Our DB enforces profiles.role NOT NULL, so "no role yet" means "no profile row yet".
    // Create the profile row with the chosen role; if it already exists, do not overwrite (immutable).
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: profileId, role }, { onConflict: 'id', ignoreDuplicates: true });

    if (upsertError) {
      console.error('Error setting role (profile upsert):', upsertError);
      setSaving(false);
      setRoleSelected(true);
      setOpen(false);
      return;
    }

    // Fetch the stored role so we don't lie if the row already existed.
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', profileId)
      .single();
    
    setSaving(false);
    
    if (error || !data) {
      console.error('Error loading profile after role set:', error);
      setRoleSelected(true);
      setOpen(false);
      return;
    }
    
    // Mark that role has been selected - this prevents modal from reopening
    setRoleSelected(true);
    
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
