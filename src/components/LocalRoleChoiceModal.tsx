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

    let finalRole = role;

    try {
      // Use API route to save profile (avoids Supabase client auth issues in production)
      // Short timeout - if it fails, we gracefully degrade to localStorage only
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, role }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const body = await res.json();
          if (body.data?.role === 'artist' || body.data?.role === 'fan') {
            finalRole = body.data.role;
          }
        } else {
          // API failed but we'll continue with localStorage
          console.warn('Profile API returned error, using localStorage only');
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        // Network error or timeout - continue with localStorage
        console.warn('Profile API failed, using localStorage only:', fetchErr);
      }

      // Always store locally (this is the source of truth for anonymous users)
      try {
        setStoredRoleOnce(userId, finalRole);
      } catch (storageError) {
        console.warn('Could not store role in localStorage:', storageError);
      }

      setSaving(false);
      onRoleSet?.(finalRole);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      }
      setOpen(false);
    } catch (err) {
      // Catch any unexpected errors to prevent stuck "Saving..." state
      console.error('Unexpected error in chooseRole:', err);
      
      // Last resort: just save locally and close
      try {
        setStoredRoleOnce(userId, role);
        onRoleSet?.(role);
        setOpen(false);
      } catch {
        setError('Could not save your role. Please try again.');
      }
      setSaving(false);
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

