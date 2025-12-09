'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StarRating } from '@/components/StarRating';
import { ReviewList } from '@/components/ReviewList';
import { ReviewForm } from '@/components/ReviewForm';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useVenue } from '@/hooks/useVenue';
import { useReviews } from '@/hooks/useReviews';
import { useReviewStats } from '@/hooks/useReviewStats';
import { useAnonUser } from '@/hooks/useAnonUser';
import { formatScore } from '@/lib/utils/scores';

export default function VenuePage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id as string;
  const { user } = useAnonUser();

  const { venue, loading: venueLoading, refetch: refetchVenue } = useVenue(venueId);
  const { reviews, myReview, otherReviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(venueId);
  const { avgScore, aspectAverages } = useReviewStats(reviews);

  const loading = venueLoading || reviewsLoading;

  return (
    <div className="page-container">
      <section className="section">
        <Link href="/" className="back-link">
          ← Back to venues
        </Link>
      </section>

      {loading && <LoadingState message="Loading venue…" />}

      {!loading && !venue && (
        <EmptyState title="Venue not found" message="The venue you're looking for doesn't exist or has been removed." />
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
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <StarRating score={avgScore} />
                      <strong style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {formatScore(avgScore)}/10 overall
                      </strong>
                      <span className="section-subtitle">
                        · {reviews.length} review{reviews.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="section-subtitle" style={{ fontSize: '0.85rem' }}>
                      {aspectAverages.sound !== null && (
                        <span>Sound {formatScore(aspectAverages.sound)}</span>
                      )}
                      {aspectAverages.vibe !== null && (
                        <span> · Vibe {formatScore(aspectAverages.vibe)}</span>
                      )}
                      {aspectAverages.staff !== null && (
                        <span> · Staff {formatScore(aspectAverages.staff)}</span>
                      )}
                      {aspectAverages.layout !== null && (
                        <span> · Layout {formatScore(aspectAverages.layout)}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>No ratings yet.</>
                )}
              </div>
            </div>
          </section>

          {!myReview && otherReviews.length > 0 && (
            <section className="section" style={{ marginBottom: '0.5rem' }}>
              <p className="section-subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Haven't played or seen a show here yet? Start by reading the community reviews below.
              </p>
            </section>
          )}

          <ReviewForm
            venueId={venueId}
            currentUserId={user?.id ?? null}
            existingReview={myReview ?? null}
            onSubmitted={refetchReviews}
          />

          {myReview && (
            <section className="section card">
              <div className="section-header">
                <h2 className="section-title">Your report card</h2>
              </div>
              <ReviewList reviews={[myReview]} showYouLabel={true} />
            </section>
          )}

          {otherReviews.length > 0 && (
            <section className="section card">
              <div className="section-header">
                <h2 className="section-title">Community reviews</h2>
                <p className="section-subtitle" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Real experiences from people who've been there.
                </p>
              </div>
              <ReviewList reviews={otherReviews} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
