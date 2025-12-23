export type StoredRole = 'artist' | 'fan';

const KEY_PREFIX = 'venue_reviews_role_';

// Fallback ID for when Supabase auth times out
export const FALLBACK_USER_ID = 'local-anonymous-user';

export function getStoredRole(userId: string | null | undefined): StoredRole | null {
  if (!userId) return null;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${userId}`);
    return raw === 'artist' || raw === 'fan' ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Set role only if it hasn't been set before (immutable unless storage is cleared).
 * Returns true if we set it, false if it already existed or couldn't be saved.
 */
export function setStoredRoleOnce(userId: string, role: StoredRole): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = `${KEY_PREFIX}${userId}`;
    const existing = localStorage.getItem(key);
    if (existing === 'artist' || existing === 'fan') return false;
    localStorage.setItem(key, role);
    return true;
  } catch {
    return false;
  }
}

export function clearStoredRole(userId: string | null | undefined): void {
  if (!userId) return;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${KEY_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}

export function clearAllStoredRoles(): void {
  if (typeof window === 'undefined') return;
  try {
    // Use localStorage.key() for better compatibility with mocks
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

/**
 * Get any stored role from localStorage (when we don't have a userId yet).
 * This is useful during auth timeouts when we can't look up by userId.
 * Returns the most recently stored role, or null if none found.
 */
export function getAnyStoredRole(): StoredRole | null {
  if (typeof window === 'undefined') return null;
  try {
    // Use localStorage.key() for better compatibility with mocks
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw === 'artist' || raw === 'fan') {
          return raw;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

