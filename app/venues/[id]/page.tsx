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
  // derived value: average score
  const avgScore =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length
      : null;
  const [loading, setLoading] = useState(true);

  // form state
  const [name, setName] = useState('');
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // helper to load reviews (we call this after submit too)
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
      // 1) load venue
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

      // 2) load reviews
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

    // clear form
    setName('');
    setScore('');
    setComment('');

    // reload reviews
    await fetchReviews();

    setSubmitting(false);
  }

  return (
    <main className="mx-auto max-w-xl p-4 space-y-3">
      <Link
        href="/"
        className="text-xs text-neutral-400 hover:underline"
      >
        ← Back to venues
      </Link>

      {loading && (
        <p className="text-sm text-neutral-500">Loading venue…</p>
      )}

      {!loading && !venue && (
        <p className="text-sm text-neutral-500">Venue not found.</p>
      )}

      {venue && (
        <>
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">{venue.name}</h1>
            <p className="text-sm text-neutral-400">
              {venue.city}, {venue.country}
            </p>
            {venue.address && (
              <p className="text-xs text-neutral-500">{venue.address}</p>
            )}

            <div className="mt-2 text-xs text-neutral-300">
              {avgScore !== null ? (
                <span>
                  Average score:{' '}
                  <span className="font-semibold">
                    {avgScore.toFixed(1)}/10
                  </span>{' '}
                  ({reviews.length} review
                  {reviews.length === 1 ? '' : 's'})
                </span>
              ) : (
                <span>No ratings yet.</span>
              )}
            </div>
          </header>

          {/* Add review form */}
          <section className="mt-4 space-y-2">
            <h2 className="text-sm font-semibold text-neutral-200">
              Add a review
            </h2>

            <form onSubmit={handleSubmit} className="space-y-2">
              <div>
                <label className="block text-xs mb-1">
                  Your name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs mb-1">
                  Score (1–10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  required
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs mb-1">
                  Comment (optional)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the sound, vibe, staff, drinks?"
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-400">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Submit review'}
              </button>
            </form>
          </section>

          {/* Existing reviews */}
          <section className="mt-6 space-y-2">
            <h2 className="text-sm font-semibold text-neutral-200">
              Reviews
            </h2>

            {reviews.length === 0 && (
              <p className="text-xs text-neutral-500">
                No reviews yet for this venue.
              </p>
            )}

            {reviews.length > 0 && (
              <ul className="space-y-2">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-neutral-800 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">
                        {r.reviewer_name || 'Anonymous'}
                      </span>
                      <span className="text-xs font-semibold">
                        {r.score}/10
                      </span>
                    </div>
                    {r.comment && (
                      <p className="mt-1 text-xs text-neutral-400">
                        {r.comment}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-neutral-500">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
