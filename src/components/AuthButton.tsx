'use client';

import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginModal } from '@/components/LoginModal';
import { SignOutButton } from '@/components/SignOutButton';
import Link from 'next/link';

export function AuthButton() {
  const { user, loading } = useCurrentUser();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  if (user) {
    return (
      <>
        <Link
          href="/account"
          className="btn btn--ghost"
          style={{ fontSize: '0.8rem', paddingInline: '0.8rem', textDecoration: 'none' }}
        >
          Account
        </Link>
        <SignOutButton />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="btn btn--primary"
        style={{ fontSize: '0.8rem', paddingInline: '0.8rem' }}
      >
        Sign in
      </button>
      <LoginModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
