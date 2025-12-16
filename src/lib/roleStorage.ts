export type StoredRole = 'artist' | 'fan';

const KEY_PREFIX = 'venue_reviews_role_';

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

