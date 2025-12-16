import type { VenueWithStats } from '@/types/venues';

type CachedVenues = {
  venues: VenueWithStats[];
  cachedAt: number;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'venue_reviews_venues_cache';

class VenuesCache {
  private venuesCache: CachedVenues | null = null;
  private pendingFetch: Promise<VenueWithStats[] | null> | null = null;

  getVenues(): VenueWithStats[] | null {
    if (!this.venuesCache && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const cached = JSON.parse(stored) as CachedVenues;
          if (Date.now() - cached.cachedAt < CACHE_DURATION) {
            this.venuesCache = cached;
            return cached.venues;
          }
        }
      } catch {
        // ignore
      }
    }

    if (this.venuesCache && Date.now() - this.venuesCache.cachedAt < CACHE_DURATION) {
      return this.venuesCache.venues;
    }

    return null;
  }

  setVenues(venues: VenueWithStats[] | null) {
    if (!venues) {
      this.venuesCache = null;
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
      return;
    }

    const cached: CachedVenues = { venues, cachedAt: Date.now() };
    this.venuesCache = cached;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
      } catch {
        // ignore
      }
    }
  }

  getPendingFetch(): Promise<VenueWithStats[] | null> | null {
    return this.pendingFetch;
  }

  setPendingFetch(promise: Promise<VenueWithStats[] | null> | null) {
    this.pendingFetch = promise;
    if (promise) {
      promise.finally(() => {
        if (this.pendingFetch === promise) {
          this.pendingFetch = null;
        }
      });
    }
  }
}

export const venuesCache = new VenuesCache();


