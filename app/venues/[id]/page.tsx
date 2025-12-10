'use client';

import { useEffect } from 'react';
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
  const { user: anonUser, loading: anonUserLoading } = useAnonUser();
  const { user: currentUser, loading: currentUserLoading } = useCurrentUser();
  // Use anonUser if no currentUser (for anonymous users)
  // Anonymous users also need profiles for the role modal
  const userForProfile = currentUser || (anonUser ? { id: anonUser.id } : null);
  const { profile, loading: profileLoading } = useProfile(userForProfile);

  const { venue, loading: venueLoading, error: venueError, refetch: refetchVenue } = useVenue(venueId);
  const { reviews, myReview, otherReviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(venueId);
  const { avgScore, aspectAverages } = useReviewStats(reviews);

  const loading = venueLoading || reviewsLoading;

  // Log errors and venue ID for debugging
  useEffect(() => {
    if (venueError) {
      console.error('Venue loading error:', venueError, 'Venue ID:', venueId);
    }
    if (venueId) {
      console.log('Loading venue with ID:', venueId);
    }
  }, [venueError, venueId]);

  return (
    <div className="page-container">
      {/* Show modal immediately when profile loads, even if venue is still loading */}
      {/* Show for both logged in users and anonymous users - only if role is null */}
      {!profileLoading && !currentUserLoading && !anonUserLoading && profile && profile.role === null && (
        <RoleChoiceModal
          profileId={profile.id}
          initialRole={profile.role as 'artist' | 'fan' | null}
          onRoleSet={(newRole) => {
            // Role is updated in database, profile will refresh via useProfile hook
            // Modal will close automatically when profile.role is no longer null
          }}
        />
      )}

      <section className="section">
        <Link href="/" className="back-link">
          ← Back to venues
        </Link>
      </section>

      {loading && <LoadingState message="Loading venue…" />}

      {!loading && !venue && (
        <EmptyState 
          title="Venue not found" 
          message={venueError || "The venue you're looking for doesn't exist or has been removed."} 
        />
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

          {!myReview && otherReviews.length > 0 && (
            <section className="section" style={{ marginBottom: '0.5rem' }}>
              <p className="section-subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Haven&apos;t played or seen a show here yet? Start by reading the community reviews below.
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
