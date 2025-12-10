'use client';

import { useState, useEffect, useRef } from 'react';
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
    
    // IMPORTANT: Role is immutable once set. Only allow update if role is currently null.
    // Use .is('role', null) to enforce immutability at database level.
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', profileId)
      .is('role', null) // Only update if role is null (immutable constraint)
      .select('role')
      .single();
    
    setSaving(false);
    
    if (error || !data) {
      // If no rows were updated (role already set), close modal silently
      // This handles the immutable constraint
      console.error('Error setting role (may be immutable):', error);
      setRoleSelected(true);
      setOpen(false);
      return;
    }
    
    // Verify the role was actually set
    if (data.role !== role) {
      // Role wasn't set - likely because it was already set (immutable)
      setRoleSelected(true);
      setOpen(false);
      return;
    }
    
    // Mark that role has been selected - this prevents modal from reopening
    setRoleSelected(true);
    
    // Update cache
    const cachedProfile = userCache.getProfile(profileId);
    if (cachedProfile) {
      userCache.setProfile(profileId, {
        ...cachedProfile,
        role,
      });
    }
    
    onRoleSet(role);
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
