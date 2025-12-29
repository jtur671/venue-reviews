'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { scoreToGrade, gradeColor } from '@/lib/utils/grades';
import { BackButton } from '@/components/BackButton';
import { RoleChoiceModal } from '@/components/RoleChoiceModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { userCache } from '@/lib/cache/userCache';

type UserRole = 'artist' | 'fan';

type Profile = {
  id: string;
  display_name: string | null;
  role: UserRole | null;
};

type AccountReviewRow = {
  id: string;
  score: number | null;
  reviewer_role: UserRole | null;
  created_at: string | null;
  venues: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
  } | null;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [reviews, setReviews] = useState<AccountReviewRow[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Function to reload reviews
  async function reloadReviews(userId?: string) {
    const userIdToUse = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!userIdToUse) {
      setReviews([]);
      setLoadingReviews(false);
      return;
    }

    setLoadingReviews(true);
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .select(
        `
        id,
        score,
        reviewer_role,
        created_at,
        venues:venue_id (
          id,
          name,
          city,
          country
        )
      `
      )
      .eq('user_id', userIdToUse)
      .order('created_at', { ascending: false });

    if (!reviewError && reviewData) {
      type SupabaseReviewRow = {
        id: string;
        score: number | null;
        reviewer_role: UserRole | null;
        created_at: string | null;
        venues: {
          id: string;
          name: string;
          city: string | null;
          country: string | null;
        } | {
          id: string;
          name: string;
          city: string | null;
          country: string | null;
        }[] | null;
      };
      const processedReviews = (reviewData ?? []).map((r: SupabaseReviewRow) => ({
        ...r,
        venues: Array.isArray(r.venues) ? r.venues[0] || null : r.venues || null,
      }));
      setReviews(processedReviews as AccountReviewRow[]);
    }
    setLoadingReviews(false);
  }

  // Load current auth user, profile, and their reviews
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error loading user:', userError);
        setLoading(false);
        return;
      }

      const user = userData.user;
      if (!user) {
        setUserEmail(null);
        setProfile(null);
        setReviews([]);
        setLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      // Load or create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      let effectiveProfile = profileData as Profile | null;

      if (!effectiveProfile) {
        // first time: create an empty profile row
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            display_name: user.user_metadata.full_name ?? user.email,
            role: null, // Start with no role selected
          })
          .select('id, display_name, role')
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          effectiveProfile = inserted as Profile;
        }
      }

      if (effectiveProfile) {
        setProfile(effectiveProfile);
        setDisplayName(effectiveProfile.display_name ?? '');
      }

      // Load this user's reviews + venues
      await reloadReviews(user.id);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  // Refresh data when page becomes visible (user navigates back)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && userEmail) {
        reloadReviews();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Also reload when component mounts/focuses (user navigates back)
    if (userEmail) {
      setTimeout(() => {
        reloadReviews();
      }, 0);
    }
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userEmail]);

  async function saveDisplayName(next: string) {
    if (!profile) return;

    setSavingProfile(true);
    setSaveMessage(null);

    const trimmed = next.trim() || null;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', profile.id);

    setSavingProfile(false);
    if (error) {
      console.error('Error updating profile:', error);
      setSaveMessage('Could not save');
    } else {
      setProfile((prev) =>
        prev ? { ...prev, display_name: trimmed } : prev
      );
      setSaveMessage('Saved');
      
      // Update cache with new display name
      if (profile) {
        userCache.setProfile(profile.id, {
          ...profile,
          display_name: next.trim() || null,
        });
      }
      
      // Dispatch custom event to notify Header component to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      }
      
      // Clear message after 2 seconds
      setTimeout(() => setSaveMessage(null), 2000);
    }
  }

  async function handleDeleteAccount() {
    if (!profile) return;

    setDeleting(true);

    // get current auth user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const authUser = userData.user;

    if (userError || !authUser) {
      console.error('No auth user found for delete:', userError);
      setDeleting(false);
      return;
    }

    // 1) delete reviews
    const { error: reviewError } = await supabase.from('reviews').delete().eq('user_id', authUser.id);

    if (reviewError) {
      console.error('Error deleting reviews:', reviewError);
    }

    // 2) delete profile
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', profile.id);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
    }

    // 3) sign out
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('Error signing out after delete:', signOutError);
    }

    setDeleting(false);
    setShowDeleteModal(false);
    // redirect to home
    window.location.href = '/';
  }

  // Derived stats
  const stats = useMemo(() => {
    if (!reviews.length) {
      return {
        venueCount: 0,
        cityCount: 0,
        avgScore: null as number | null,
        avgGrade: null as ReturnType<typeof scoreToGrade>,
      };
    }

    const venueIds = new Set<string>();
    const cities = new Set<string>();

    let sum = 0;
    let n = 0;

    for (const r of reviews) {
      if (r.venues?.id) venueIds.add(r.venues.id);
      if (r.venues?.city) cities.add(r.venues.city);

      if (r.score != null) {
        sum += r.score;
        n += 1;
      }
    }

    const avgScore = n > 0 ? sum / n : null;
    const avgGrade = scoreToGrade(avgScore);

    return {
      venueCount: venueIds.size,
      cityCount: cities.size,
      avgScore,
      avgGrade,
    };
  }, [reviews]);

  if (loading) {
    return (
      <main className="page-container">
        <section className="section">
          <p className="section-subtitle">Loading account…</p>
        </section>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="page-container">
        <section className="section">
          <h1 className="section-title">Account</h1>
          <p className="section-subtitle">
            You&apos;re not signed in. Sign in with Google to see your report cards.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="section">
        <div style={{ marginBottom: '1rem' }}>
          <BackButton href="/" label="Back to venues" />
        </div>
      </section>
      {profile && (
        <RoleChoiceModal
          profileId={profile.id}
          initialRole={profile.role as 'artist' | 'fan' | null}
          onRoleSet={(newRole) =>
            setProfile((prev) => (prev ? { ...prev, role: newRole } : prev))
          }
        />
      )}

      {/* Profile & role */}
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Your account</h1>
          <p className="section-subtitle">
            Update your details and keep track of every room you&apos;ve graded.
          </p>
        </div>

        <div className="card" style={{ gap: '0.75rem' }}>
          <div>
            <div className="section-subtitle" style={{ fontSize: '0.8rem', marginBottom: '0.15rem' }}>
              Signed in as
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{userEmail}</div>
          </div>

          <div>
            <label className="section-subtitle" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={(e) => saveDisplayName(e.target.value)}
              placeholder="Anonymous"
              className="input"
            />
            <div
              className="section-subtitle"
              style={{ fontSize: '0.75rem', height: '1rem', marginTop: '0.15rem', color: saveMessage === 'Could not save' ? '#ef4444' : 'inherit' }}
            >
              {savingProfile
                ? 'Saving…'
                : saveMessage
                ? saveMessage
                : '\u00A0' /* keep height even when empty */}
            </div>
          </div>

          <div>
            <div className="section-subtitle" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>
              Role
            </div>
            {profile?.role ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.15rem 0.6rem',
                  borderRadius: 999,
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  background: profile.role === 'artist' ? 'rgba(79, 70, 229, 0.08)' : 'rgba(37, 99, 235, 0.08)',
                  color: profile.role === 'artist' ? '#4f46e5' : '#2563eb',
                }}
              >
                {profile.role === 'artist' ? 'Artist / Band' : 'Fan / Attendee'}
              </span>
            ) : (
              <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Not set yet</p>
            )}
            <p className="section-subtitle" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
              Your role is set once when you join and can&apos;t be changed. This helps separate artist vs fan scores.
            </p>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="section">
        <div className="card" style={{ display: 'flex', gap: '1rem' }}>
          <div className="stats-column">
            <div className="section-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Venues graded
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-main)' }}>{stats.venueCount}</div>
          </div>

          <div className="stats-column">
            <div className="section-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Cities covered
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-main)' }}>{stats.cityCount}</div>
          </div>

          <div style={{ flex: 1 }}>
            <div className="section-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Average grade
            </div>
            {stats.avgScore != null ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: gradeColor(stats.avgGrade),
                  }}
                >
                  {stats.avgGrade}
                </span>
                <span className="section-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {stats.avgScore.toFixed(1)}/10
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-muted)' }}>—</div>
            )}
          </div>
        </div>
      </section>

      {/* My report cards */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Your report cards</h2>
          <p className="section-subtitle">
            All the rooms you&apos;ve graded, in one place.
          </p>
        </div>

        {loadingReviews && <p className="section-subtitle">Loading your reviews…</p>}

        {!loadingReviews && reviews.length === 0 && (
          <p className="section-subtitle">
            You haven&apos;t graded any venues yet. Start on the home page and leave your first report card.
          </p>
        )}

        {!loadingReviews && reviews.length > 0 && (
          <ul className="review-list">
            {reviews.map((r) => {
              const venue = r.venues;
              if (!venue) return null;

              const grade = scoreToGrade(r.score);
              const color = gradeColor(grade);

              return (
                <li key={r.id} className="card review-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.95rem',
                        }}
                      >
                        {venue.name}
                      </div>
                      <div className="section-subtitle" style={{ fontSize: '0.8rem' }}>
                        {[venue.city, venue.country].filter(Boolean).join(' · ')}
                      </div>
                      <div
                        className="section-subtitle"
                        style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}
                      >
                        {r.reviewer_role
                          ? r.reviewer_role === 'artist'
                            ? 'Artist perspective'
                            : r.reviewer_role === 'fan'
                            ? 'Fan perspective'
                            : 'Unclassified perspective'
                          : 'Unclassified perspective'}
                      </div>
                      {r.created_at && (
                        <div
                          className="section-subtitle"
                          style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}
                        >
                          Created {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.25rem',
                      }}
                    >
                      <span
                        style={{
                          padding: '0.1rem 0.6rem',
                          borderRadius: 999,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: `${color}22`,
                          color,
                        }}
                      >
                        {grade ?? '—'}
                      </span>
                      {r.score != null && (
                        <span className="section-subtitle" style={{ fontSize: '0.8rem' }}>
                          {r.score.toFixed(1)}/10 overall
                        </span>
                      )}
                      <Link
                        href={`/venues/${venue.id}`}
                        className="btn btn--ghost"
                        style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}
                      >
                        View report card
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Delete account button */}
      <section className="section" style={{ marginTop: '2rem' }}>
        <div className="card" style={{ borderColor: '#fee2e2', borderWidth: 1 }}>
          <h3
            className="section-title"
            style={{ fontSize: '1rem', color: '#b91c1c', marginBottom: '0.5rem' }}
          >
            Danger zone
          </h3>
          <p className="section-subtitle" style={{ marginBottom: '0.75rem' }}>
            Deleting your account will remove your profile and all of your report cards. This cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => setShowDeleteModal(true)}
              style={{ fontSize: '0.9rem' }}
            >
              Delete account
            </button>
          </div>
        </div>
      </section>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        deleting={deleting}
      />
    </main>
  );
}
