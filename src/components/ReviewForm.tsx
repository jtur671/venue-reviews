'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ReviewFormProps = {
  venueId: string;
  onSubmitted: () => void;
};

type AspectKey = 'sound_score' | 'vibe_score' | 'staff_score' | 'layout_score';

const ASPECTS: { key: AspectKey; label: string }[] = [
  { key: 'sound_score', label: 'Sound' },
  { key: 'vibe_score', label: 'Vibe / Crowd' },
  { key: 'staff_score', label: 'Staff / Bar' },
  { key: 'layout_score', label: 'Layout / Sightlines' },
];

export function ReviewForm({ venueId, onSubmitted }: ReviewFormProps) {
  const [reviewer, setReviewer] = useState('');
  const [comment, setComment] = useState('');
  const [aspects, setAspects] = useState<Record<AspectKey, number>>({
    sound_score: 8,
    vibe_score: 8,
    staff_score: 8,
    layout_score: 8,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAspectChange(key: AspectKey, value: number) {
    setAspects((prev) => ({ ...prev, [key]: value }));
  }

  const overallScore = Math.round(
    (aspects.sound_score +
      aspects.vibe_score +
      aspects.staff_score +
      aspects.layout_score) /
      4
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error } = await supabase.from('reviews').insert({
      venue_id: venueId,
      reviewer: reviewer.trim() || null,
      comment: comment.trim() || null,
      score: overallScore,
      sound_score: aspects.sound_score,
      vibe_score: aspects.vibe_score,
      staff_score: aspects.staff_score,
      layout_score: aspects.layout_score,
    });

    if (error) {
      console.error('Error adding review:', error);
      setError('Could not save your review. Please try again.');
      setSubmitting(false);
      return;
    }

    setReviewer('');
    setComment('');
    setAspects({
      sound_score: 8,
      vibe_score: 8,
      staff_score: 8,
      layout_score: 8,
    });
    setSubmitting(false);
    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="section card">
      <div className="section-header" style={{ marginBottom: '0.75rem' }}>
        <h2 className="section-title">Leave a report card</h2>
        <p className="section-subtitle">
          Rate the room so other people know what they're walking into.
        </p>
      </div>

      <div style={{ marginBottom: '0.6rem' }}>
        <label
          className="section-subtitle"
          style={{ display: 'block', marginBottom: '0.25rem' }}
        >
          Name (optional)
        </label>
        <input
          className="input"
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          placeholder="Anonymous"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '0.5rem',
          marginBottom: '0.8rem',
        }}
      >
        {ASPECTS.map(({ key, label }) => (
          <div key={key}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.2rem',
              }}
            >
              <span className="section-subtitle">{label}</span>
              <span className="section-subtitle" style={{ fontWeight: 500 }}>
                {aspects[key]}/10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={aspects[key]}
              onChange={(e) => handleAspectChange(key, Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>

      <div
        className="section-subtitle"
        style={{ marginBottom: '0.8rem', fontWeight: 500 }}
      >
        Overall: {overallScore}/10
      </div>

      <div style={{ marginBottom: '0.7rem' }}>
        <label
          className="section-subtitle"
          style={{ display: 'block', marginBottom: '0.25rem' }}
        >
          What should people know?
        </label>
        <textarea
          className="textarea"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Best and worst parts of the night…"
        />
      </div>

      {error && (
        <p
          style={{
            fontSize: '0.75rem',
            color: '#f97373',
            marginBottom: '0.4rem',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn btn--primary"
        style={{ width: '100%' }}
      >
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}
