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

    const { data, error: fetchError } = await getAllVenues();

    if (fetchError) {
      console.error('Error loading venues:', fetchError);
      setError(fetchError.message || 'Failed to load venues');
      setVenues([]);
    } else {
      setVenues(data || []);
    }

    setLoading(false);
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
