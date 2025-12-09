import { AspectKey, Review } from '@/types/venues';
import { SCORE_MIN, SCORE_MAX } from '@/constants/ui';

/**
 * Score calculation utilities
 */

/**
 * Calculate overall score from aspect scores
 */
export function calculateOverallScore(aspects: Record<AspectKey, number>): number {
  const sum =
    aspects.sound_score + aspects.vibe_score + aspects.staff_score + aspects.layout_score;
  return Math.round(sum / 4);
}

/**
 * Calculate average score from an array of reviews
 */
export function calculateAverageScore(reviews: Review[]): number | null {
  if (!reviews.length) return null;
  const total = reviews.reduce((sum, r) => sum + (r.score || 0), 0);
  return total / reviews.length;
}

/**
 * Calculate average for a specific aspect across reviews
 */
export function calculateAspectAverage(
  reviews: Review[],
  aspectKey: AspectKey
): number | null {
  const values = reviews
    .map((r) => r[aspectKey])
    .filter((val): val is number => typeof val === 'number' && val >= SCORE_MIN && val <= SCORE_MAX);

  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate all aspect averages
 */
export function calculateAllAspectAverages(reviews: Review[]): {
  sound: number | null;
  vibe: number | null;
  staff: number | null;
  layout: number | null;
} {
  return {
    sound: calculateAspectAverage(reviews, 'sound_score'),
    vibe: calculateAspectAverage(reviews, 'vibe_score'),
    staff: calculateAspectAverage(reviews, 'staff_score'),
    layout: calculateAspectAverage(reviews, 'layout_score'),
  };
}

/**
 * Format score for display (rounds to 1 decimal place)
 */
export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—';
  return score.toFixed(1);
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number | null): string {
  if (score == null) return 'var(--text-muted)';
  if (score >= 8) return '#10b981'; // green
  if (score >= 6) return '#f59e0b'; // amber
  return '#ef4444'; // red
}
