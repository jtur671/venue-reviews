type StarRatingProps = {
  score: number | null;
};

// 0–10 -> 0–5 stars
export function StarRating({ score }: StarRatingProps) {
  if (score === null || Number.isNaN(score)) return null;
  const maxStars = 5;
  const normalized = Math.max(0, Math.min(10, score));
  const filledStars = Math.round((normalized / 10) * maxStars);
  const stars = Array.from({ length: maxStars }, (_, i) =>
    i < filledStars ? '★' : '☆'
  ).join('');
  return <span className="rating-stars">{stars}</span>;
}
