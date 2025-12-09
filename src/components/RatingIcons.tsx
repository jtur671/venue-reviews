type RatingIconsProps = {
  score: number | null;
  maxIcons?: number;
};

export function RatingIcons({ score, maxIcons = 5 }: RatingIconsProps) {
  if (score == null) {
    return <span className="rating-none" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No score yet</span>;
  }

  const filled = Math.round(score / 2); // 1–10 → 0–5

  return (
    <span className="rating-icons">
      {Array.from({ length: maxIcons }).map((_, i) => (
        <span
          key={i}
          className={i < filled ? 'rating-icon rating-icon--filled' : 'rating-icon'}
        >
          {i < filled ? '🎤' : '🎙'}
        </span>
      ))}
    </span>
  );
}
