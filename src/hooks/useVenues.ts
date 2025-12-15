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
      const timeoutMs = 10_000;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Timed out loading venues')), timeoutMs);
      });

      const { data, error: fetchError } = await Promise.race([getAllVenues(), timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

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
