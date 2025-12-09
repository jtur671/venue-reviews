import { useCallback, useEffect, useState } from 'react';
import { getAllVenues } from '@/lib/services/venueService';
import { VenueWithStats } from '@/types/venues';
import { useAnonUser } from './useAnonUser';

export function useVenues() {
  const { user, loading: userLoading } = useAnonUser();
  const [venues, setVenues] = useState<VenueWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVenues = useCallback(async () => {
    if (userLoading || !user) return;
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
  }, [userLoading, user]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  return {
    venues,
    loading,
    error,
    refetch: loadVenues,
  };
}
