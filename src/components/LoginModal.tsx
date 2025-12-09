'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // Note: OAuth redirects away, so we don't set loading to false here
    } catch (err) {
      setError('Failed to sign in with Google');
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // Sign up
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo:
              typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined,
          },
        });
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email to confirm your account! After confirming, you\'ll be redirected to your account page.');
        }
      } else {
        // Sign in
        if (!password) {
          setError('Password is required');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setError(error.message);
        } else {
          onClose();
          // Redirect to account page after successful sign in
          router.push('/account');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setEmail('');
    setPassword('');
    setError(null);
    setMessage(null);
    setIsSignUp(false);
    onClose();
  }

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '400px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            {isSignUp ? 'Sign up' : 'Sign in'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn btn--primary"
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          or
        </div>

        <form onSubmit={handleEmailSubmit}>
          <div className="form-field">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input"
              required
              disabled={loading}
            />
          </div>

          <div className="form-field">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              className="input"
              required={!isSignUp}
              disabled={loading}
              minLength={isSignUp ? 6 : undefined}
            />
          </div>

          {error && (
            <div className="form-error" style={{ marginBottom: '0.5rem' }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ marginBottom: '0.5rem', color: '#10b981', fontSize: '0.85rem' }}>
              {message}
            </div>
          )}

          <div className="form-actions" style={{ flexDirection: 'column', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn--primary"
              style={{ width: '100%' }}
            >
              {loading ? (isSignUp ? 'Signing up...' : 'Signing in...') : isSignUp ? 'Sign up' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="btn btn--ghost"
              style={{ width: '100%', fontSize: '0.85rem' }}
              disabled={loading}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
