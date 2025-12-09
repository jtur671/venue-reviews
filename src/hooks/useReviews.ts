import { useCallback, useEffect, useMemo, useState } from 'react';
import { getReviewsByVenueId } from '@/lib/services/reviewService';
import { Review } from '@/types/venues';
import { useAnonUser } from './useAnonUser';

export function useReviews(venueId: string | undefined) {
  const { user, loading: userLoading } = useAnonUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    if (!venueId || userLoading || !user) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getReviewsByVenueId(venueId);

    if (fetchError) {
      console.error('Error loading reviews:', fetchError);
      setError(fetchError.message || 'Failed to load reviews');
      setReviews([]);
    } else {
      setReviews(data || []);
    }

    setLoading(false);
  }, [venueId, userLoading, user]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const myReview = useMemo(() => {
    if (!user || !reviews.length) return null;
    return reviews.find((r) => r.user_id === user.id) || null;
  }, [reviews, user]);

  const otherReviews = useMemo(() => {
    if (!myReview) return reviews;
    return reviews.filter((r) => r.id !== myReview.id);
  }, [reviews, myReview]);

  return {
    reviews,
    myReview,
    otherReviews,
    loading,
    error,
    refetch: loadReviews,
  };
}
