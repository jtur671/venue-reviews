'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { StarRating } from '@/components/StarRating';
import { ReviewList } from '@/components/ReviewList';
import { ReviewForm } from '@/components/ReviewForm';
import { Review } from '@/types/venues';
import { useAnonUser } from '@/hooks/useAnonUser';

type Venue = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
};

type AspectKey = 'sound_score' | 'vibe_score' | 'staff_score' | 'layout_score';

export default function VenuePage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: userLoading } = useAnonUser();

  const avgScore = useMemo(() => {
    if (!reviews.length) return null;
    const total = reviews.reduce((sum, r) => sum + (r.score || 0), 0);
    return total / reviews.length;
  }, [reviews]);

  const aspectAverages = useMemo(() => {
    const calcAverage = (key: AspectKey) => {
      const values = reviews
        .map((r) => r[key])
        .filter((val): val is number => typeof val === 'number');
      if (!values.length) return null;
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    return {
      sound: calcAverage('sound_score'),
      vibe: calcAverage('vibe_score'),
      staff: calcAverage('staff_score'),
      layout: calcAverage('layout_score'),
    };
  }, [reviews]);

  const loadVenue = useCallback(async () => {
    if (!venueId || userLoading || !user) return;

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
  }, [venueId, userLoading, user]);

  const loadReviews = useCallback(async () => {
    if (!venueId || userLoading || !user) return;

    const { data, error } = await supabase
      .from('reviews')
      .select(
        'id, reviewer: reviewer_name, score, comment, created_at, sound_score, vibe_score, staff_score, layout_score'
      )
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    } else {
      setReviews((data || []) as Review[]);
    }
  }, [venueId, userLoading, user]);

  useEffect(() => {
    async function loadAll() {
      if (userLoading || !user) return;
      setLoading(true);
      await Promise.all([loadVenue(), loadReviews()]);
      setLoading(false);
    }

    loadAll();
  }, [loadVenue, loadReviews, userLoading, user]);

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <StarRating score={avgScore} />
                      <strong>{avgScore.toFixed(1)}/10 overall</strong>
                      <span className="section-subtitle">
                        · {reviews.length} review{reviews.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="section-subtitle" style={{ marginTop: '0.35rem' }}>
                      {aspectAverages.sound !== null && (
                        <span>Sound {aspectAverages.sound.toFixed(1)}</span>
                      )}
                      {aspectAverages.vibe !== null && (
                        <span> · Vibe {aspectAverages.vibe.toFixed(1)}</span>
                      )}
                      {aspectAverages.staff !== null && (
                        <span> · Staff {aspectAverages.staff.toFixed(1)}</span>
                      )}
                      {aspectAverages.layout !== null && (
                        <span> · Layout {aspectAverages.layout.toFixed(1)}</span>
                      )}
                    </div>
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
