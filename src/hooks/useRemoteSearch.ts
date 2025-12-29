import { useEffect, useState } from 'react';
import { RemoteVenue } from '@/types/venues';
import { SEARCH_DEBOUNCE_MS } from '@/constants/ui';

export function useRemoteSearch(search: string, selectedCity: string) {
  const [remoteResults, setRemoteResults] = useState<RemoteVenue[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const hasQuery = search.trim().length > 0 || selectedCity !== 'All';

  useEffect(() => {
    if (!hasQuery) {
      setRemoteResults([]);
      setRemoteError(null);
      setRemoteLoading(false);
      return;
    }

    const q = search.trim();
    const city = selectedCity !== 'All' ? selectedCity : '';

    const timeout = setTimeout(async () => {
      if (!q && !city) return;

      setRemoteLoading(true);
      setRemoteError(null);

      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (city) params.set('city', city);

        const res = await fetch(`/api/search-venues?${params.toString()}`);
        if (!res.ok) {
          let errorMessage = 'There was a problem searching venues.';
          try {
            const errorJson = await res.json();
            errorMessage = errorJson.error || errorMessage;
            if (process.env.NODE_ENV === 'development' && errorJson.details) {
              console.error('Search API error:', res.status, errorJson.details);
            }
          } catch {
            const text = await res.text();
            console.error('Search API error:', res.status, text);
          }
          setRemoteError(errorMessage);
          setRemoteResults([]);
        } else {
          const json = await res.json();
          setRemoteResults(json.results || []);
        }
      } catch (err) {
        console.error('Search request failed:', err);
        setRemoteError('There was a problem searching venues.');
        setRemoteResults([]);
      } finally {
        setRemoteLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [hasQuery, search, selectedCity]);

  return {
    remoteResults,
    remoteLoading,
    remoteError,
    hasQuery,
  };
}
