import { useCallback, useEffect, useState } from 'react';
import { getAllVenues } from '@/lib/services/venueService';
import { VenueWithStats } from '@/types/venues';

export function useVenues() {
  const [venues, setVenues] = useState<VenueWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Don't hard-fail on slow networks; just warn if it takes unusually long.
      const warnAfterMs = 12_000;
      const warnId = setTimeout(() => {
        console.warn('Venues are taking longer than usual to load...');
      }, warnAfterMs);

      const { data, error: fetchError } = await getAllVenues();
      clearTimeout(warnId);

      if (fetchError) {
        console.error('Error loading venues:', fetchError);
        setError(fetchError.message || 'Failed to load venues');
        setVenues([]);
      } else {
        setVenues(data || []);
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
