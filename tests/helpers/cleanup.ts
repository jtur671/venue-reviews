import { supabase } from '@/lib/supabaseClient';

/**
 * Test cleanup helper functions
 * 
 * These utilities help ensure test data is properly cleaned up
 * after tests complete to avoid polluting the database.
 */

export interface TestCleanup {
  userIds: string[];
  venueIds: string[];
  reviewIds: string[];
}

/**
 * Create a new cleanup tracker
 */
export function createCleanupTracker(): TestCleanup {
  return {
    userIds: [],
    venueIds: [],
    reviewIds: [],
  };
}

/**
 * Clean up all test data tracked in the cleanup object
 */
export async function cleanupTestData(cleanup: TestCleanup): Promise<void> {
  // Delete reviews first (they reference venues and users)
  if (cleanup.reviewIds.length > 0) {
    await supabase.from('reviews').delete().in('id', cleanup.reviewIds);
  }

  // Delete venues
  if (cleanup.venueIds.length > 0) {
    await supabase.from('venues').delete().in('id', cleanup.venueIds);
  }

  // Delete profiles (users)
  if (cleanup.userIds.length > 0) {
    await supabase.from('profiles').delete().in('id', cleanup.userIds);
  }
}

/**
 * Clean up a single test user (profile and auth session)
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  if (!userId) return;
  
  // Delete profile
  await supabase.from('profiles').delete().eq('id', userId);
  
  // Sign out (if still signed in)
  await supabase.auth.signOut();
}

/**
 * Clean up a single test venue
 */
export async function cleanupTestVenue(venueId: string): Promise<void> {
  if (!venueId) return;
  
  // Delete venue (reviews will be cascade deleted if foreign key constraints are set up)
  await supabase.from('venues').delete().eq('id', venueId);
}

/**
 * Clean up a single test review
 */
export async function cleanupTestReview(reviewId: string): Promise<void> {
  if (!reviewId) return;
  
  await supabase.from('reviews').delete().eq('id', reviewId);
}
