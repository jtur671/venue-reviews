'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { StarRating } from '@/components/StarRating';
import { ReviewList, Review } from '@/components/ReviewList';
import { ReviewForm } from '@/components/ReviewForm';

type Venue = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
};

export default function VenuePage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const avgScore = useMemo(
    () =>
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length
        : null,
    [reviews]
  );

  const loadVenue = useCallback(async () => {
    if (!venueId) return;

    const { data, error } = await supabase
      .from('venues')
      .select('id, name, city, country, address')
      .eq('id', venueId)
      .single();

    if (error) {
      console.error('Error loading venue:', error);
      setVenue(null);
    } else {
      setVenue(data as Venue);
    }
  }, [venueId]);

  const loadReviews = useCallback(async () => {
    if (!venueId) return;

    const { data, error } = await supabase
      .from('reviews')
      .select('id, reviewer_name, score, comment, created_at')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    } else {
      setReviews((data || []) as Review[]);
    }
  }, [venueId]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([loadVenue(), loadReviews()]);
      setLoading(false);
    }

    loadAll();
  }, [loadVenue, loadReviews]);

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
                    <StarRating score={avgScore} />{' '}
                    <strong>{avgScore.toFixed(1)}/10</strong> ·{' '}
                    {reviews.length} review
                    {reviews.length === 1 ? '' : 's'}
                  </>
                ) : (
                  <>No ratings yet.</>
                )}
              </div>
            </div>
          </section>

          <ReviewForm venueId={venueId} onSubmitted={loadReviews} />

          <section className="section card">
            <div className="section-header">
              <h2 className="section-title">Reviews</h2>
            </div>
            <ReviewList reviews={reviews} />
          </section>
        </>
      )}
    </div>
  );
}
