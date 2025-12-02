'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ReviewFormProps = {
  venueId: string;
  onSubmitted: () => Promise<void> | void;
};

export function ReviewForm({ venueId, onSubmitted }: ReviewFormProps) {
  const [name, setName] = useState('');
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const numericScore = Number(score);

    if (!numericScore || numericScore < 1 || numericScore > 10) {
      setFormError('Score must be a number between 1 and 10.');
      return;
    }

    if (!venueId) {
      setFormError('Missing venue id.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('reviews').insert({
      venue_id: venueId,
      reviewer_name: name || null,
      score: numericScore,
      comment: comment || null,
    });

    if (error) {
      console.error('Error creating review:', error);
      setFormError('Could not save review. Please try again.');
      setSubmitting(false);
      return;
    }

    setName('');
    setScore('');
    setComment('');

    await onSubmitted();
    setSubmitting(false);
  }

  return (
    <section
      className="section card--soft"
      style={{ padding: '0.9rem 1rem' }}
    >
      <div className="section-header">
        <h2 className="section-title">Add a review</h2>
        <p className="section-subtitle">
          Be honest but fair. Focus on sound, vibe, staff, and how it felt
          to be in the room.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="section"
        style={{ marginBottom: 0 }}
      >
        <div style={{ marginBottom: '0.6rem' }}>
          <label
            className="section-subtitle"
            style={{ display: 'block', marginBottom: '0.25rem' }}
          >
            Your name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            className="input"
          />
        </div>

        <div style={{ marginBottom: '0.6rem' }}>
          <label
            className="section-subtitle"
            style={{ display: 'block', marginBottom: '0.25rem' }}
          >
            Score (1–10)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
            className="input"
          />
        </div>

        <div style={{ marginBottom: '0.6rem' }}>
          <label
            className="section-subtitle"
            style={{ display: 'block', marginBottom: '0.25rem' }}
          >
            Comment (optional)
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was the sound, vibe, crowd, and staff?"
            className="textarea"
          />
        </div>

        {formError && (
          <p
            style={{
              fontSize: '0.75rem',
              color: '#f97373',
              marginBottom: '0.4rem',
            }}
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn--primary"
          style={{ width: '100%' }}
        >
          {submitting ? 'Saving…' : 'Submit review'}
        </button>
      </form>
    </section>
  );
}
