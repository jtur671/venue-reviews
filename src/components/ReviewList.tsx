'use client';

import { StarRating } from '@/components/StarRating';
import { Review } from '@/types/venues';
import { formatDateFull } from '@/lib/utils/date';

type ReviewListProps = {
  reviews: Review[];
  showYouLabel?: boolean;
};

export function ReviewList({ reviews, showYouLabel = false }: ReviewListProps) {
  if (!reviews.length) {
    return (
      <p className="section-subtitle">
        No reviews yet. Be the first to share how this venue actually feels live.
      </p>
    );
  }

  return (
    <ul className="review-list">
      {reviews.map((r, index) => {
        const reviewerName = r.reviewer ?? r.reviewer_name ?? null;
        const displayName = reviewerName || 'Anonymous';
        const hasAspects =
          r.sound_score !== null ||
          r.vibe_score !== null ||
          r.staff_score !== null ||
          r.layout_score !== null;

        return (
          <li
            key={r.id}
            style={{
              marginBottom: index < reviews.length - 1 ? '1rem' : '0',
              paddingBottom: index < reviews.length - 1 ? '1rem' : '0',
              borderBottom:
                index < reviews.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <div className="review-meta-row" style={{ marginBottom: '0.3rem' }}>
              <span className="review-author">
                {showYouLabel ? 'You' : displayName}
                {showYouLabel && reviewerName && ` (${reviewerName})`}
              </span>
              <span className="review-score" style={{ fontWeight: 600 }}>
                <StarRating score={r.score} /> {r.score}/10 overall
              </span>
            </div>

            {hasAspects && (
              <div
                className="section-subtitle"
                style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}
              >
                {r.sound_score !== null && <span>Sound {r.sound_score}</span>}
                {r.vibe_score !== null && <span> · Vibe {r.vibe_score}</span>}
                {r.staff_score !== null && <span> · Staff {r.staff_score}</span>}
                {r.layout_score !== null && <span> · Layout {r.layout_score}</span>}
              </div>
            )}

            {r.comment && (
              <p className="review-body" style={{ marginBottom: '0.4rem' }}>
                {r.comment}
              </p>
            )}
            <p className="review-date">{formatDateFull(r.created_at)}</p>
          </li>
        );
      })}
    </ul>
  );
}
