'use client';

import { useEffect, useState } from 'react';
import { getStoredRole, setStoredRoleOnce, type StoredRole } from '@/lib/roleStorage';

type Props = {
  userId: string;
  onRoleSet?: (role: StoredRole) => void;
};

export function LocalRoleChoiceModal({ userId, onRoleSet }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
    // "Immutable": only set if empty.
    const didSet = setStoredRoleOnce(userId, role);
    setSaving(false);

    if (didSet) {
      onRoleSet?.(role);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      }
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

