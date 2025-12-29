/**
 * Reviews Cache
 * 
 * Provides in-memory caching for reviews by venue ID.
 * Uses stale-while-revalidate pattern for better perceived performance.
 */

import { Review } from '@/types/venues';

type CachedReviews = {
  reviews: Review[];
  cachedAt: number;
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (reviews change more frequently)

class ReviewsCache {
  private cache: Map<string, CachedReviews> = new Map();
  private pendingFetches: Map<string, Promise<Review[]>> = new Map();

  /**
   * Get cached reviews for a venue ID
   */
  get(venueId: string): Review[] | null {
    const cached = this.cache.get(venueId);
    if (cached && Date.now() - cached.cachedAt < CACHE_DURATION) {
      return cached.reviews;
    }
    return null;
  }

  /**
   * Set reviews in cache
   */
  set(venueId: string, reviews: Review[]) {
    this.cache.set(venueId, {
      reviews,
      cachedAt: Date.now(),
    });
  }

  /**
   * Invalidate cache for a venue (e.g., after creating/updating a review)
   * Also clears any pending fetch to ensure fresh data is loaded
   */
  invalidate(venueId: string) {
    this.cache.delete(venueId);
    this.pendingFetches.delete(venueId);
  }

  /**
   * Clear all caches
   */
  clear() {
    this.cache.clear();
    this.pendingFetches.clear();
  }

  /**
   * Get pending fetch promise for a venue
   */
  getPendingFetch(venueId: string): Promise<Review[]> | null {
    return this.pendingFetches.get(venueId) || null;
  }

  /**
   * Set pending fetch promise
   */
  setPendingFetch(venueId: string, promise: Promise<Review[]> | null) {
    if (promise) {
      this.pendingFetches.set(venueId, promise);
      // Clean up promise when it resolves
      promise.finally(() => {
        this.pendingFetches.delete(venueId);
      });
    } else {
      this.pendingFetches.delete(venueId);
    }
  }
}

export const reviewsCache = new ReviewsCache();
