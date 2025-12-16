import { useCallback, useEffect, useState } from 'react';
import { getAllVenues } from '@/lib/services/venueService';
import { venuesCache } from '@/lib/cache/venuesCache';
import { VenueWithStats } from '@/types/venues';

export function useVenues() {
  // IMPORTANT (hydration): do NOT read localStorage-backed cache during the initial render.
  // Next will server-render this Client Component; if the client renders cached venues immediately,
  // the HTML won't match and hydration will fail.
  const [venues, setVenues] = useState<VenueWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // If there's already a pending fetch, await it instead of starting another.
      const pending = venuesCache.getPendingFetch();
      if (pending) {
        const cached = await pending;
        if (cached) {
          setVenues(cached);
        }
        setLoading(false);
        return;
      }

      // Don't hard-fail on slow networks; just warn if it takes unusually long.
      const warnAfterMs = 12_000;
      const warnId = setTimeout(() => {
        console.warn('Venues are taking longer than usual to load...');
      }, warnAfterMs);

      const fetchPromise = (async () => {
        const { data, error: fetchError } = await getAllVenues();
        if (fetchError) return null;
        return data || [];
      })();

      venuesCache.setPendingFetch(fetchPromise);

      const result = await fetchPromise;
      clearTimeout(warnId);

      if (!result) {
        setError('Failed to load venues');
        setVenues([]);
      } else {
        setVenues(result);
        venuesCache.setVenues(result);
      }
    } catch (err) {
      console.error('Unexpected error loading venues:', err);
      setError('Failed to load venues');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // After mount, hydrate from cache for instant perceived performance.
    // This runs only on the client and won't cause hydration mismatch.
    const cachedVenues = venuesCache.getVenues();
    if (cachedVenues && cachedVenues.length > 0) {
      setVenues(cachedVenues);
      setLoading(false);
    }

    // Load venues immediately - they're public data and don't require authentication
    // Use setTimeout to avoid calling setState synchronously in effect
    const timeoutId = setTimeout(() => {
      loadVenues();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadVenues]);

  return {
    venues,
    loading,
    error,
    refetch: loadVenues,
  };
}
