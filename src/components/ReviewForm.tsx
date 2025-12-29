'use client';

import { useState, useEffect, FormEvent, type CSSProperties } from 'react';
import {
  createReview,
  updateReview,
  deleteReview,
  type CreateReviewInput,
  type UpdateReviewInput,
} from '@/lib/services/reviewService';
import { Review, AspectKey, DEFAULT_ASPECTS } from '@/types/venues';
import { ASPECTS } from '@/constants/aspects';
import { ERROR_COLOR } from '@/constants/ui';
import { calculateOverallScore, formatScore } from '@/lib/utils/scores';
import { formatError } from '@/lib/utils/errors';
import { reviewsCache } from '@/lib/cache/reviewsCache';

type ReviewFormProps = {
  venueId: string;
  currentUserId: string | null;
  reviewerRole: 'artist' | 'fan' | null;
  profileLoading?: boolean;
  existingReview?: Review | null;
  onSubmitted: () => void;
};

export function ReviewForm({
  venueId,
  currentUserId,
  reviewerRole,
  profileLoading = false,
  existingReview,
  onSubmitted,
}: ReviewFormProps) {
  const [reviewer, setReviewer] = useState('');
  const [comment, setComment] = useState('');
  const [aspects, setAspects] = useState<Record<AspectKey, number>>(DEFAULT_ASPECTS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!existingReview) {
      // Reset form when no existing review
      // Use setTimeout to avoid calling setState synchronously in effect
      setTimeout(() => {
        setReviewer('');
        setComment('');
        setAspects({
          sound_score: 7,
          vibe_score: 7,
          staff_score: 7,
          layout_score: 7,
        });
      }, 0);
      return;
    }

    // Use setTimeout to avoid calling setState synchronously in effect
    setTimeout(() => {
      setReviewer(existingReview.reviewer ?? existingReview.reviewer_name ?? '');
      setComment(existingReview.comment ?? '');
      setAspects({
        sound_score: existingReview.sound_score ?? DEFAULT_ASPECTS.sound_score,
        vibe_score: existingReview.vibe_score ?? DEFAULT_ASPECTS.vibe_score,
        staff_score: existingReview.staff_score ?? DEFAULT_ASPECTS.staff_score,
        layout_score: existingReview.layout_score ?? DEFAULT_ASPECTS.layout_score,
      });
    }, 0);
  }, [existingReview]);

  function handleAspectChange(key: AspectKey, value: number) {
    setAspects((prev) => ({ ...prev, [key]: value }));
  }

  const overallScore = calculateOverallScore(aspects);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentUserId) {
      setError('Unable to start a session. Please try again.');
      return;
    }

    if (profileLoading) {
      setError('Loading your profile… please try again.');
      return;
    }

    if (!reviewerRole) {
      setError('Pick Artist or Fan first (one-time) before submitting a review.');
      return;
    }

    setSubmitting(true);

    if (existingReview) {
      const updateData: UpdateReviewInput = {
        reviewer_name: reviewer.trim() || null,
        comment: comment.trim() || null,
        score: overallScore,
        sound_score: aspects.sound_score,
        vibe_score: aspects.vibe_score,
        staff_score: aspects.staff_score,
        layout_score: aspects.layout_score,
        reviewer_role: reviewerRole,
      };

      const { error } = await updateReview(existingReview.id, currentUserId, updateData);

      if (error) {
        setError(error.message || 'Could not update your review. Please try again.');
        setSubmitting(false);
        return;
      }
    } else {
      const createData: CreateReviewInput = {
        venue_id: venueId,
        user_id: currentUserId,
        reviewer_name: reviewer.trim() || null,
        comment: comment.trim() || null,
        score: overallScore,
        sound_score: aspects.sound_score,
        vibe_score: aspects.vibe_score,
        staff_score: aspects.staff_score,
        layout_score: aspects.layout_score,
        reviewer_role: reviewerRole,
      };

      console.log('Creating review with user_id:', currentUserId, 'venue_id:', venueId);
      const { data, error } = await createReview(createData);
      console.log('Review creation response - data:', data?.id, 'user_id in response:', data?.user_id, 'error:', error);

      if (error) {
        setError(formatError(error, 'Could not save your review. Please try again.'));
        setSubmitting(false);
        return;
      }

      // If no error but also no data, something went wrong
      if (!data) {
        console.error('Review creation returned no error but also no data');
        setError('Could not save your review. Please try again.');
        setSubmitting(false);
        return;
      }

      setReviewer('');
      setComment('');
      setAspects(DEFAULT_ASPECTS);
    }

    setSubmitting(false);
    
    // Invalidate reviews cache for this venue
    reviewsCache.invalidate(venueId);
    
    console.log('Review submitted successfully, calling onSubmitted callback');
    // Add a small delay to ensure database transaction is committed
    setTimeout(() => {
      onSubmitted();
    }, 100);
  }

  async function handleDelete() {
    if (!existingReview || !currentUserId) return;

    if (!confirm('Remove your report card? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError(null);

    const { error } = await deleteReview(existingReview.id, currentUserId);

    if (error) {
      setError(formatError(error, 'Could not remove your review. Please try again.'));
      setDeleting(false);
      return;
    }

    setReviewer('');
    setComment('');
    setAspects(DEFAULT_ASPECTS);
    setDeleting(false);
    
    // Invalidate reviews cache for this venue
    reviewsCache.invalidate(venueId);
    
    onSubmitted();
  }

  const isDisabled =
    submitting || deleting || !currentUserId || profileLoading || !reviewerRole;

  return (
    <form onSubmit={handleSubmit} className="section card">
      <div className="section-header section-header-large">
        <h2 className="section-title">
          {existingReview ? 'Update your report card' : 'Leave a report card'}
        </h2>
        <p className="section-subtitle">
          {existingReview
            ? 'Update your ratings and notes after another show.'
            : "Rate the room so other people know what they're walking into before they book a show."}
        </p>
        {!profileLoading && !reviewerRole && (
          <p className="section-subtitle" style={{ marginTop: '0.35rem' }}>
            Choose <strong>Artist</strong> or <strong>Fan</strong> once to enable submitting.
          </p>
        )}
      </div>

      <div className="form-field">
        <label className="section-subtitle form-label">
          Name (optional)
        </label>
        <input
          className="input"
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          placeholder="Anonymous"
          disabled={submitting || deleting}
        />
      </div>

      <div className="form-field" style={{ marginBottom: '1rem' }}>
        {ASPECTS.map(({ key, label, icon, color }) => {
          const value = aspects[key];
          const fillPercentage = ((value - 1) / 9) * 100;
          return (
            <div key={key} className="slider-row">
              <div className="slider-label-row">
                <span className="slider-icon">{icon}</span>
                <span className="section-subtitle">{label}</span>
                <span className="slider-value">{value}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={value}
                onChange={(e) => handleAspectChange(key, Number(e.target.value))}
                disabled={submitting || deleting}
                className="slider-input"
                style={
                  {
                    '--slider-color': color,
                    '--slider-fill': `${fillPercentage}%`,
                  } as CSSProperties
                }
              />
            </div>
          );
        })}
        <div className="section-subtitle text-xs text-center text-muted" style={{ marginTop: '0.5rem' }}>
          1 = Poor · 5 = Okay · 10 = Amazing
        </div>
      </div>

      <div className="form-field" style={{ marginBottom: '0.7rem' }}>
        <label className="section-subtitle form-label">
          What should people know?
        </label>
        <textarea
          className="textarea"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Best and worst parts of the night, surprises, deal-breakers…"
          disabled={submitting || deleting}
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions" style={{ marginBottom: existingReview ? '0.5rem' : 0 }}>
          <div className="badge-score" style={{ whiteSpace: 'nowrap' }}>
            Overall: {formatScore(overallScore)}/10
          </div>
        <button
          type="submit"
          disabled={isDisabled}
          className="btn btn--primary"
          style={{ flex: 1, minWidth: 0 }}
        >
          {submitting
            ? existingReview
              ? 'Updating…'
              : 'Submitting…'
            : existingReview
              ? 'Update report card'
              : 'Submit review'}
        </button>
      </div>

      {existingReview && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn--ghost text-sm"
          style={{ width: '100%', padding: '0.35rem 0.75rem' }}
        >
          {deleting ? 'Removing…' : 'Remove my report card'}
        </button>
      )}
    </form>
  );
}
