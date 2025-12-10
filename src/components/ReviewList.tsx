'use client';

import { memo } from 'react';
import { Review } from '@/types/venues';
import { formatDateFull } from '@/lib/utils/date';
import { formatScore } from '@/lib/utils/scores';

type ReviewListProps = {
  myReview: Review | null;
  reviews: Review[];
};

const ReviewBody = memo(function ReviewBody({ review }: { review: Review }) {
  const reviewerName = review.reviewer ?? review.reviewer_name ?? null;
  const displayName = reviewerName || 'Anonymous';
  const hasAspects =
    review.sound_score !== null ||
    review.vibe_score !== null ||
    review.staff_score !== null ||
    review.layout_score !== null;

  return (
    <>
      <div className="review-header">
        <span className="review-author">{displayName}</span>
        <span className="review-score">
          {formatScore(review.score)}/10
        </span>
      </div>
      {hasAspects && (
        <div className="review-aspects">
          {review.sound_score !== null && <span>Sound {review.sound_score}</span>}
          {review.vibe_score !== null && <span> · Vibe {review.vibe_score}</span>}
          {review.staff_score !== null && <span> · Staff {review.staff_score}</span>}
          {review.layout_score !== null && <span> · Layout {review.layout_score}</span>}
        </div>
      )}
      {review.comment && <p className="review-comment">{review.comment}</p>}
      <div className="review-date">{formatDateFull(review.created_at)}</div>
    </>
  );
});

export const ReviewList = memo(function ReviewList({ myReview, reviews }: ReviewListProps) {
  const hasAny = myReview || reviews.length > 0;

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Community reviews</h2>
        {hasAny && (
          <p className="section-subtitle">
            Real experiences from people who&apos;ve been in the room.
          </p>
        )}
      </div>

      {!hasAny && (
        <p className="section-subtitle">
          No report cards yet. Be the first to rate this room.
        </p>
      )}

      {myReview && (
        <div 
          className="card review-card review-card--mine"
          aria-label={`Your report card for this venue with a score of ${myReview.score}/10`}
        >
          <div className="review-header">
            <span className="review-author">You</span>
            <span className="review-badge">Your report card</span>
          </div>
          <ReviewBody review={myReview} />
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="review-list">
          {reviews.map((review) => {
            const reviewerName = review.reviewer ?? review.reviewer_name ?? 'Anonymous';
            return (
              <li 
                key={review.id} 
                className="card review-card"
                aria-label={`Review by ${reviewerName} with a score of ${review.score}/10`}
              >
                <ReviewBody review={review} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
});
