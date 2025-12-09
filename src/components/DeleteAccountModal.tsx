'use client';

import { useState, FormEvent } from 'react';

type DeleteAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
};

export function DeleteAccountModal({ isOpen, onClose, onConfirm, deleting }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (confirmText === 'delete') {
      onConfirm();
    }
  }

  function handleClose() {
    setConfirmText('');
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
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0, color: '#b91c1c' }}>
            Delete account
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={deleting}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: 'var(--text-muted)',
              cursor: deleting ? 'not-allowed' : 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <p className="section-subtitle" style={{ marginBottom: '1rem' }}>
          This will delete your profile and all of your report cards from Venue Reviews. This action
          cannot be undone.
        </p>

        <p className="section-subtitle" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
          Type <strong>delete</strong> below to confirm:
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type delete to confirm"
              className="input"
              disabled={deleting}
              style={{ marginBottom: '1rem' }}
            />
          </div>

          <div className="form-actions" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={deleting}
              className="btn btn--ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={confirmText !== 'delete' || deleting}
              className="btn btn--danger"
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
