'use client';

import { StarRating } from '@/components/StarRating';

export type Review = {
  id: string;
  reviewer_name: string | null;
  score: number;
  comment: string | null;
  created_at: string;
};

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
      {reviews.map((r) => (
        <li key={r.id} style={{ marginBottom: '0.65rem' }}>
          <div className="review-meta-row">
            <span className="review-author">
              {r.reviewer_name || 'Anonymous'}
            </span>
            <span className="review-score">
              <StarRating score={r.score} /> {r.score}/10
            </span>
          </div>
          {r.comment && <p className="review-body">{r.comment}</p>}
          <p className="review-date">
            {new Date(r.created_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
