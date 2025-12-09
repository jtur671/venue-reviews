'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ReviewList } from '@/components/ReviewList';
import { ReviewForm } from '@/components/ReviewForm';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useVenue } from '@/hooks/useVenue';
import { useReviews } from '@/hooks/useReviews';
import { useReviewStats } from '@/hooks/useReviewStats';
import { useAnonUser } from '@/hooks/useAnonUser';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProfile } from '@/hooks/useProfile';
import { scoreToGrade, gradeColor } from '@/lib/utils/grades';
import { RoleChoiceModal } from '@/components/RoleChoiceModal';

export default function VenuePage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id as string;
  const { user: anonUser } = useAnonUser();
  const { user: currentUser } = useCurrentUser();
  const { profile } = useProfile(currentUser);

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
          <div className="venue-hero">
            <div className="venue-hero-overlay">
              <span className="venue-hero-tag">
                {venue.city ? `${venue.city} venue` : 'Live music venue'}
              </span>
              <span className="venue-hero-title">{venue.name}</span>
            </div>
          </div>

          <section className="section card">
            <div className="venue-header-top">
              <div>
                <h1 className="venue-title">{venue.name}</h1>
                <p className="venue-location">
                  {venue.city}
                  {venue.country ? ` · ${venue.country}` : null}
                </p>
                {venue.address && (
                  <p className="venue-address">{venue.address}</p>
                )}
                {avgScore !== null && (
                  <div className="section-subtitle" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
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
                )}
              </div>
              {(() => {
                const grade = scoreToGrade(avgScore);
                const color = gradeColor(grade);
                return (
                  <div className="venue-grade-badge" style={{ borderColor: color }}>
                    <div className="venue-grade-letter" style={{ color }}>
                      {grade ?? '—'}
                    </div>
                    <div className="venue-grade-meta">
                      <span className="venue-grade-label">Overall grade</span>
                      {avgScore != null && (
                        <span className="venue-grade-score">
                          {avgScore.toFixed(1)}/10
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {profile && (
            <RoleChoiceModal
              profileId={profile.id}
              initialRole={profile.role as 'artist' | 'fan' | null}
              onRoleSet={(newRole) => {
                // Role is updated in database, profile will refresh via useProfile hook
              }}
            />
          )}

          {!myReview && otherReviews.length > 0 && (
            <section className="section" style={{ marginBottom: '0.5rem' }}>
              <p className="section-subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Haven't played or seen a show here yet? Start by reading the community reviews below.
              </p>
            </section>
          )}

          <ReviewForm
            venueId={venueId}
            currentUserId={currentUser?.id ?? anonUser?.id ?? null}
            existingReview={myReview ?? null}
            onSubmitted={refetchReviews}
          />

          <ReviewList myReview={myReview} reviews={otherReviews} />
        </>
      )}
    </div>
  );
}
