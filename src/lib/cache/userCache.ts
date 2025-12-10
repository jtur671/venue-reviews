/**
 * User and Profile Cache
 * 
 * Provides in-memory caching with localStorage persistence for user and profile data.
 * Uses stale-while-revalidate pattern: returns cached data immediately while fetching fresh data.
 */

type CachedUser = {
  id: string;
  email?: string;
  cachedAt: number;
};

type CachedProfile = {
  id: string;
  display_name: string | null;
  role: 'artist' | 'fan' | null;
  cachedAt: number;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY_USER = 'venue_reviews_user_cache';
const STORAGE_KEY_PROFILE = 'venue_reviews_profile_cache';

class UserCache {
  private userCache: CachedUser | null = null;
  private profileCache: Map<string, CachedProfile> = new Map();
  private pendingUserFetch: Promise<CachedUser | null> | null = null;
  private pendingProfileFetches: Map<string, Promise<CachedProfile | null>> = new Map();

  /**
   * Get cached user or null if expired/missing
   */
  getUser(): CachedUser | null {
    if (!this.userCache) {
      // Try to load from localStorage (only in browser)
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(STORAGE_KEY_USER);
          if (stored) {
            const cached = JSON.parse(stored) as CachedUser;
            if (Date.now() - cached.cachedAt < CACHE_DURATION) {
              this.userCache = cached;
              return cached;
            }
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    }

    if (this.userCache && Date.now() - this.userCache.cachedAt < CACHE_DURATION) {
      return this.userCache;
    }

    return null;
  }

  /**
   * Set user in cache
   */
  setUser(user: { id: string; email?: string } | null) {
    if (!user) {
      this.userCache = null;
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY_USER);
        } catch (e) {
          // Ignore
        }
      }
      return;
    }

    const cached: CachedUser = {
      ...user,
      cachedAt: Date.now(),
    };

    this.userCache = cached;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cached));
      } catch (e) {
        // Ignore localStorage errors (quota exceeded, etc.)
      }
    }
  }

  /**
   * Get cached profile for a user ID
   */
  getProfile(userId: string): CachedProfile | null {
    const cached = this.profileCache.get(userId);
    if (cached && Date.now() - cached.cachedAt < CACHE_DURATION) {
      return cached;
    }

    // Try localStorage
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PROFILE}_${userId}`);
      if (stored) {
        const cached = JSON.parse(stored) as CachedProfile;
        if (Date.now() - cached.cachedAt < CACHE_DURATION) {
          this.profileCache.set(userId, cached);
          return cached;
        }
      }
    } catch (e) {
      // Ignore
    }

    return null;
  }

  /**
   * Set profile in cache
   */
  setProfile(userId: string, profile: { id: string; display_name: string | null; role: 'artist' | 'fan' | null } | null) {
    if (!profile) {
      this.profileCache.delete(userId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`${STORAGE_KEY_PROFILE}_${userId}`);
        } catch (e) {
          // Ignore
        }
      }
      return;
    }

    const cached: CachedProfile = {
      ...profile,
      cachedAt: Date.now(),
    };

    this.profileCache.set(userId, cached);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEY_PROFILE}_${userId}`, JSON.stringify(cached));
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Clear all caches
   */
  clear() {
    this.userCache = null;
    this.profileCache.clear();
    this.pendingUserFetch = null;
    this.pendingProfileFetches.clear();

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_USER);
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith(STORAGE_KEY_PROFILE)) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Get or create pending user fetch promise
   */
  getPendingUserFetch(): Promise<CachedUser | null> | null {
    return this.pendingUserFetch;
  }

  /**
   * Set pending user fetch promise
   */
  setPendingUserFetch(promise: Promise<CachedUser | null> | null) {
    this.pendingUserFetch = promise;
  }

  /**
   * Get or create pending profile fetch promise
   */
  getPendingProfileFetch(userId: string): Promise<CachedProfile | null> | null {
    return this.pendingProfileFetches.get(userId) || null;
  }

  /**
   * Set pending profile fetch promise
   */
  setPendingProfileFetch(userId: string, promise: Promise<CachedProfile | null> | null) {
    if (promise) {
      this.pendingProfileFetches.set(userId, promise);
      // Clean up promise when it resolves
      promise.finally(() => {
        this.pendingProfileFetches.delete(userId);
      });
    } else {
      this.pendingProfileFetches.delete(userId);
    }
  }
}

export const userCache = new UserCache();
