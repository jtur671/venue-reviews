'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ThemeToggle } from '@/components/ThemeToggle';
import { userCache } from '@/lib/cache/userCache';
import { LoginModal } from '@/components/LoginModal';

type CurrentUser = {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  displayName?: string;
  role?: 'artist' | 'fan' | null;
};

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    async function loadUser() {
      // Try cache first for instant render
      const cachedUser = userCache.getUser();
      if (cachedUser) {
        const cachedProfile = userCache.getProfile(cachedUser.id);
        setUser({
          ...cachedUser,
          name: undefined,
          avatarUrl: undefined,
          displayName: cachedProfile?.display_name ?? undefined,
        });
        setLoading(false);
      }

      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        setUser(null);
        setLoading(false);
        userCache.setUser(null);
        return;
      }

      // Check cache for profile
      const cachedProfile = userCache.getProfile(u.id);
      
      // Fetch display name and role from profiles table (use cache if available)
      let profileData = cachedProfile;
      if (!cachedProfile) {
        const { data: fetchedProfile } = await supabase
          .from('profiles')
          .select('display_name, role')
          .eq('id', u.id)
          .maybeSingle();
        profileData = fetchedProfile ? { id: u.id, display_name: fetchedProfile.display_name, role: fetchedProfile.role, cachedAt: Date.now() } : null;
        if (profileData) {
          userCache.setProfile(u.id, profileData);
        }
      }

      const userData: CurrentUser = {
        id: u.id,
        email: u.email ?? undefined,
        name: u.user_metadata.full_name ?? undefined,
        avatarUrl: u.user_metadata.picture ?? u.user_metadata.avatar_url ?? undefined,
        displayName: profileData?.display_name ?? undefined,
        role: profileData?.role ?? undefined,
      };

      userCache.setUser(userData);
      setUser(userData);
      setLoading(false);
    }

    loadUser();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user;
      if (!u) {
        setUser(null);
        return;
      }

      // Check cache for profile
      let profileData = userCache.getProfile(u.id);
      if (!profileData) {
        const { data: fetchedProfile } = await supabase
          .from('profiles')
          .select('display_name, role')
          .eq('id', u.id)
          .maybeSingle();
        profileData = fetchedProfile ? { id: u.id, display_name: fetchedProfile.display_name, role: fetchedProfile.role, cachedAt: Date.now() } : null;
        if (profileData) {
          userCache.setProfile(u.id, profileData);
        }
      }

      const userData: CurrentUser = {
        id: u.id,
        email: u.email ?? undefined,
        name: u.user_metadata.full_name ?? undefined,
        avatarUrl: u.user_metadata.picture ?? u.user_metadata.avatar_url ?? undefined,
        displayName: profileData?.display_name ?? undefined,
        role: profileData?.role ?? undefined,
      };

      userCache.setUser(userData);
      setUser(userData);

      // Redirect to account page on sign in or sign up
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && u.email) {
        // Only redirect if we're not already on the account page
        if (pathname && pathname !== '/account') {
          router.push('/account');
        }
      }
    });

    // Also listen for profile updates - refresh when page becomes visible
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // Only refresh if cache is stale (> 1 minute old)
        const cached = userCache.getUser();
        if (!cached || Date.now() - cached.cachedAt > 60 * 1000) {
          loadUser();
        }
      }
    }

    // Listen for custom event when profile is updated (including role changes)
    function handleProfileUpdate() {
      // Invalidate cache and reload
      const currentUser = userCache.getUser();
      if (currentUser) {
        userCache.setProfile(currentUser.id, null); // Invalidate profile cache
      }
      loadUser();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [pathname, router]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return;
    }
    
    // Clear all caches on sign out
    userCache.clear();
    
    window.location.href = '/';
  }

  return (
    <header className="app-header">
      <div
        className="app-header-inner"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div>
            <div className="app-brand">
              <span className="app-logo-dot" />
              <span className="app-brand-text">Venue Reviews</span>
            </div>
            <p className="app-tagline">
              Rotten Tomatoes, but for live music venues.
            </p>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {loading ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading...</div>
          ) : user && user.email ? (
            <>
              <Link
                href="/account"
                className="chip chip--active"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '999px',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '999px',
                      background: '#1f2937',
                      color: '#f9fafb',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                    }}
                  >
                    {(user.displayName || user.name || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: '#ffffff',
                    fontWeight: 500,
                  }}
                >
                  {user.displayName || user.name || user.email}
                </span>
              </Link>
              {user.role && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: user.role === 'artist' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {user.role}
                </span>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="btn btn--ghost"
                style={{ fontSize: '0.8rem', paddingInline: '0.8rem' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setShowLoginModal(true)}
              style={{ fontSize: '0.8rem', paddingInline: '0.8rem' }}
            >
              Sign in
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </header>
  );
}
