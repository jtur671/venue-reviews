'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type UserRole = 'artist' | 'fan';

type Props = {
  profileId: string;
  initialRole: UserRole | null;
  onRoleSet: (role: UserRole) => void;
};

export function RoleChoiceModal({ profileId, initialRole, onRoleSet }: Props) {
  const [open, setOpen] = useState(initialRole === null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function chooseRole(role: UserRole) {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);
    setSaving(false);
    if (error) {
      console.error('Error setting role:', error);
      return;
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
