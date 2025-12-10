import { useCallback, useEffect, useMemo, useState } from 'react';
import { getReviewsByVenueId } from '@/lib/services/reviewService';
import { Review } from '@/types/venues';
import { useAnonUser } from './useAnonUser';
import { reviewsCache } from '@/lib/cache/reviewsCache';

export function useReviews(venueId: string | undefined) {
  const { user, loading: userLoading } = useAnonUser();
  
  // Try to get cached reviews immediately
  const cachedReviews = venueId ? reviewsCache.get(venueId) : null;
  const [reviews, setReviews] = useState<Review[]>(cachedReviews || []);
  const [loading, setLoading] = useState(!cachedReviews && !!venueId);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    if (!venueId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    // Don't wait for user - reviews can load independently
    // Check cache first
    const cached = reviewsCache.get(venueId);
    if (cached) {
      setReviews(cached);
      setLoading(false);
    }

    // Check if there's already a pending fetch
    const pending = reviewsCache.getPendingFetch(venueId);
    if (pending) {
      try {
        const freshReviews = await pending;
        setReviews(freshReviews);
        setLoading(false);
        setError(null);
      } catch (err) {
        setError('Failed to load reviews');
        setLoading(false);
      }
      return;
    }

    // Create fetch promise
    setLoading(true);
    setError(null);

    const fetchPromise = (async () => {
      const { data, error: fetchError } = await getReviewsByVenueId(venueId);

      if (fetchError) {
        console.error('Error loading reviews:', fetchError);
        throw new Error(fetchError.message || 'Failed to load reviews');
      }

      const reviewsData = data || [];
      reviewsCache.set(venueId, reviewsData);
      return reviewsData;
    })();

    reviewsCache.setPendingFetch(venueId, fetchPromise);

    try {
      const freshReviews = await fetchPromise;
      setReviews(freshReviews);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
      // Keep cached reviews if available
      if (!cached) {
        setReviews([]);
      }
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    // Only wait for user if we need to determine "my review"
    // But we can show cached reviews immediately
    if (venueId && !userLoading) {
      loadReviews();
    }
  }, [venueId, userLoading, loadReviews]);

  const myReview = useMemo(() => {
    if (!user || !reviews.length) return null;
    return reviews.find((r) => r.user_id === user.id) || null;
  }, [reviews, user]);

  const otherReviews = useMemo(() => {
    if (!myReview) return reviews;
    return reviews.filter((r) => r.id !== myReview.id);
  }, [reviews, myReview]);

  const refetch = useCallback(() => {
    if (venueId) {
      reviewsCache.invalidate(venueId);
      loadReviews();
    }
  }, [venueId, loadReviews]);

  return {
    reviews,
    myReview,
    otherReviews,
    loading,
    error,
    refetch,
  };
}
