import { useCallback, useEffect, useState } from 'react';
import { getVenueById, type Venue } from '@/lib/services/venueService';
import { useAnonUser } from './useAnonUser';

export function useVenue(venueId: string | undefined) {
  // Don't wait for user - venue data is independent
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVenue = useCallback(async () => {
    if (!venueId) {
      setVenue(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getVenueById(venueId);

    if (fetchError) {
      console.error('Error loading venue:', fetchError);
      setError(fetchError.message || 'Failed to load venue');
      setVenue(null);
    } else {
      setVenue(data);
    }

    setLoading(false);
  }, [venueId]);

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  return {
    venue,
    loading,
    error,
    refetch: loadVenue,
  };
}
