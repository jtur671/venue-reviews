'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useProfile, type UserRole } from '@/hooks/useProfile';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function RolePicker() {
  const { user } = useCurrentUser();
  const { profile, loading } = useProfile(user);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if no user, profile is loading, role is set, or dismissed
  if (!user || loading || profile?.role || dismissed) {
    return null;
  }

  async function handleRoleSelect(role: UserRole) {
    if (!user) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating role:', error);
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h3 className="section-title" style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>
            Are you an artist or a fan?
          </h3>
          <p className="section-subtitle" style={{ fontSize: '0.8rem', margin: 0 }}>
            Set your role so we can show the right scores.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.2rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleRoleSelect('artist')}
          disabled={updating}
          className="btn btn--primary"
          style={{ fontSize: '0.85rem', paddingInline: '1rem' }}
        >
          {updating ? 'Updating...' : "I'm an artist / band"}
        </button>
        <button
          type="button"
          onClick={() => handleRoleSelect('fan')}
          disabled={updating}
          className="btn btn--primary"
          style={{ fontSize: '0.85rem', paddingInline: '1rem' }}
        >
          {updating ? 'Updating...' : "I'm a fan / attendee"}
        </button>
        <button
          type="button"
          onClick={() => handleRoleSelect('both')}
          disabled={updating}
          className="btn btn--ghost"
          style={{ fontSize: '0.85rem', paddingInline: '1rem' }}
        >
          {updating ? 'Updating...' : 'Both'}
        </button>
      </div>
    </div>
  );
}
