import { useMemo } from 'react';
import { VenueWithStats } from '@/types/venues';
import { makeVenueKey, makeNameOnlyKey } from '@/lib/venueKeys';
import { POPULAR_CITIES_LIMIT, RECENTLY_RATED_LIMIT } from '@/constants/ui';

export function useVenueStats(venues: VenueWithStats[]) {
  const popularCityStats = useMemo(() => {
    const map = new Map<string, { venueCount: number; reviewCount: number }>();

    venues.forEach((v) => {
      if (!v.city) return;
      const current = map.get(v.city) || { venueCount: 0, reviewCount: 0 };
      current.venueCount += 1;
      current.reviewCount += v.reviewCount;
      map.set(v.city, current);
    });

    return Array.from(map.entries())
      .sort((a, b) => {
        if (b[1].reviewCount !== a[1].reviewCount) {
          return b[1].reviewCount - a[1].reviewCount;
        }
        return b[1].venueCount - a[1].venueCount;
      })
      .slice(0, POPULAR_CITIES_LIMIT)
      .map(([city, stats]) => ({ city, ...stats }));
  }, [venues]);

  const popularCities = useMemo(() => popularCityStats.map((c) => c.city), [popularCityStats]);

  const recentlyRated = useMemo(() => {
    return [...venues]
      .filter((v) => !!v.latestReviewAt)
      .sort((a, b) => {
        const aTime = a.latestReviewAt ? new Date(a.latestReviewAt).getTime() : 0;
        const bTime = b.latestReviewAt ? new Date(b.latestReviewAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, RECENTLY_RATED_LIMIT);
  }, [venues]);

  const existingVenueLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    venues.forEach((v) => {
      if (!v.name || !v.city) return;
      const key = makeVenueKey(v.name, v.city);
      lookup[key] = v.id;
      const nameOnlyKey = makeNameOnlyKey(v.name);
      if (!lookup[nameOnlyKey]) {
        lookup[nameOnlyKey] = v.id;
      }
    });
    return lookup;
  }, [venues]);

  return {
    popularCityStats,
    popularCities,
    recentlyRated,
    existingVenueLookup,
  };
}
