'use client';

import { StarRating } from '@/components/StarRating';
import { Review } from '@/types/venues';

type ReviewListProps = {
  reviews: Review[];
};

export function ReviewList({ reviews }: ReviewListProps) {
  if (!reviews.length) {
    return (
      <p className="section-subtitle">
        No reviews yet. Be the first to share how this venue actually feels live.
      </p>
    );
  }

  return (
    <ul className="review-list">
      {reviews.map((r) => {
        const reviewerName = r.reviewer ?? r.reviewer_name ?? 'Anonymous';
        const hasAspects =
          r.sound_score !== null ||
          r.vibe_score !== null ||
          r.staff_score !== null ||
          r.layout_score !== null;

        return (
          <li key={r.id} style={{ marginBottom: '0.65rem' }}>
            <div className="review-meta-row">
              <span className="review-author">{reviewerName}</span>
              <span className="review-score">
                <StarRating score={r.score} /> {r.score}/10
              </span>
            </div>

            {hasAspects && (
              <div className="section-subtitle" style={{ marginBottom: '0.35rem' }}>
                {r.sound_score !== null && <span>Sound {r.sound_score}/10</span>}
                {r.vibe_score !== null && <span> · Vibe {r.vibe_score}/10</span>}
                {r.staff_score !== null && <span> · Staff {r.staff_score}/10</span>}
                {r.layout_score !== null && <span> · Layout {r.layout_score}/10</span>}
              </div>
            )}

            {r.comment && <p className="review-body">{r.comment}</p>}
            <p className="review-date">
              {new Date(r.created_at).toLocaleString()}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
