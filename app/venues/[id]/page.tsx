'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Venue = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
};

type Review = {
  id: string;
  reviewer_name: string | null;
  score: number;
  comment: string | null;
  created_at: string;
};

export default function VenuePage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const avgScore =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length
      : null;

  const [name, setName] = useState('');
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function fetchReviews() {
    if (!venueId) return;

    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .select('id, reviewer_name, score, comment, created_at')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (reviewError) {
      console.error('Error loading reviews:', reviewError);
    } else {
      setReviews((reviewData || []) as Review[]);
    }
  }

  useEffect(() => {
    if (!venueId) return;

    async function loadVenueAndReviews() {
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('id, name, city, country, address')
        .eq('id', venueId)
        .single();

      if (venueError) {
        console.error('Error loading venue:', venueError);
      } else {
        setVenue(venueData as Venue);
      }

      await fetchReviews();
      setLoading(false);
    }

    loadVenueAndReviews();
  }, [venueId]);

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

    await fetchReviews();
    setSubmitting(false);
  }

  return (
    <div className="page-container">
      <section className="section">
        <Link href="/" className="back-link">
          ← Back to venues
        </Link>
      </section>

      {loading && (
        <section className="section">
          <p className="section-subtitle">Loading venue…</p>
        </section>
      )}

      {!loading && !venue && (
        <section className="section">
          <p className="section-subtitle">Venue not found.</p>
        </section>
      )}

      {venue && (
        <>
          <section className="section card">
            <div className="section-header">
              <h1 className="venue-header-name">{venue.name}</h1>
              <p className="venue-header-meta">
                {venue.city}, {venue.country}
              </p>
              {venue.address && (
                <p className="venue-header-address">{venue.address}</p>
              )}
              <div className="venue-header-score">
                {avgScore !== null ? (
                  <>
                    Average score <strong>{avgScore.toFixed(1)}/10</strong> ·{' '}
                    {reviews.length} review
                    {reviews.length === 1 ? '' : 's'}
                  </>
                ) : (
                  <>No ratings yet.</>
                )}
              </div>
            </div>
          </section>

          <section className="section card--soft" style={{ padding: '0.9rem 1rem' }}>
            <div className="section-header">
              <h2 className="section-title">Add a review</h2>
              <p className="section-subtitle">
                Be honest but fair. Focus on sound, vibe, staff, and how it felt
                to be in the room.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="section" style={{ marginBottom: 0 }}>
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
                <p style={{ fontSize: '0.75rem', color: '#f97373', marginBottom: '0.4rem' }}>
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

          <section className="section card">
            <div className="section-header">
              <h2 className="section-title">Reviews</h2>
            </div>

            {reviews.length === 0 && (
              <p className="section-subtitle">
                No reviews yet. Be the first to share how this venue actually
                feels live.
              </p>
            )}

            {reviews.length > 0 && (
              <ul className="review-list">
                {reviews.map((r) => (
                  <li key={r.id} style={{ marginBottom: '0.65rem' }}>
                    <div className="review-meta-row">
                      <span className="review-author">
                        {r.reviewer_name || 'Anonymous'}
                      </span>
                      <span className="review-score">{r.score}/10</span>
                    </div>
                    {r.comment && <p className="review-body">{r.comment}</p>}
                    <p className="review-date">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
