'use client';

import { useAnonUser } from '@/hooks/useAnonUser';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProfile } from '@/hooks/useProfile';
import { RoleChoiceModal } from '@/components/RoleChoiceModal';
import { LocalRoleChoiceModal } from '@/components/LocalRoleChoiceModal';

/**
 * Ensures every session (including anonymous) picks a role once.
 * This avoids "reviewer_role = null" reviews and lets us show role UI consistently.
 */
export function RoleGate() {
  // Ensure there is always at least an anonymous session user.
  const { user: anonUser, loading: anonLoading } = useAnonUser();
  // Upgrade to "current user" if a real login exists.
  const { user: currentUser, loading: currentLoading } = useCurrentUser();

  const isEmailUser = !!currentUser?.email;
  const sessionUserId = currentUser?.id ?? anonUser?.id ?? null;
  const { profile, loading: profileLoading } = useProfile(isEmailUser ? currentUser : null);

  const ready = !anonLoading && !currentLoading && !profileLoading;

  if (!ready) return null;

  // Logged-in *email* users: prefer profiles.role
  if (isEmailUser && currentUser?.id) {
    if (!profile) {
      // No profile yet: prompt and create it with chosen role.
      return <RoleChoiceModal profileId={currentUser.id} initialRole={null} onRoleSet={() => {}} />;
    }
    // If profile exists, role is already set (DB enforces NOT NULL).
    return null;
  }

  // Anonymous users (including Supabase anonymous auth sessions): store role locally.
  if (sessionUserId) {
    return <LocalRoleChoiceModal userId={sessionUserId} />;
  }

  return null;
}

