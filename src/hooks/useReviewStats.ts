import { useMemo } from 'react';
import { Review } from '@/types/venues';
import {
  calculateAverageScore,
  calculateAllAspectAverages,
} from '@/lib/utils/scores';

export function useReviewStats(reviews: Review[]) {
  const avgScore = useMemo(() => calculateAverageScore(reviews), [reviews]);

  const aspectAverages = useMemo(
    () => calculateAllAspectAverages(reviews),
    [reviews]
  );

  return {
    avgScore,
    aspectAverages,
  };
}
