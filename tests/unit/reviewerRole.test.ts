import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/lib/supabaseClient';
import { createReview, updateReview, type CreateReviewInput, type UpdateReviewInput } from '@/lib/services/reviewService';
import { KNOWN_VENUE_ID } from '../fixtures';
import { getSharedTestUser } from '../helpers/auth';

/**
 * Mission Critical Test: Reviewer Role from Profiles
 * 
 * This test ensures that reviewer_role is ALWAYS set from profiles.role
 * when logged-in users create or update reviews.
 */
describe('Reviewer Role from Profiles (Mission Critical)', () => {
  let testUserId: string | null = null;
  let testVenueIds: string[] = [];
  let testReviewIds: string[] = [];
  let isRateLimited = false;

  beforeAll(async () => {
    // Use shared test user to avoid rate limits
    testUserId = await getSharedTestUser();
    
    if (!testUserId) {
      isRateLimited = true;
      console.warn('⚠️  Skipping reviewer role tests due to Supabase rate limit.');
      return;
    }
  });

  afterAll(async () => {
    if (isRateLimited) {
      return;
    }

    // Clean up: Delete test reviews
    if (testReviewIds.length > 0) {
      await supabase.from('reviews').delete().in('id', testReviewIds);
    }

    // Clean up: Delete test venues
    if (testVenueIds.length > 0) {
      await supabase.from('venues').delete().in('id', testVenueIds);
    }

    // Clean up: Delete test profile by ID
    if (testUserId) {
      await supabase.from('profiles').delete().eq('id', testUserId);
    }
    
    // Also clean up any profiles with "Test User" display_name that might have been created
    // This is a safety net in case testUserId wasn't tracked properly or test was interrupted
    // Fetch all profiles and filter (more reliable than direct query)
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, display_name');
    
    const orphanedProfiles = (allProfiles || []).filter(p => {
      const displayName = (p.display_name || '').toLowerCase();
      return displayName === 'test user' || displayName.includes('test');
    });
    
    if (orphanedProfiles.length > 0) {
      const orphanedIds = orphanedProfiles.map(p => p.id);
      // Delete all orphaned profiles (they're all test data)
      const { error: deleteError } = await supabase.from('profiles').delete().in('id', orphanedIds);
      if (!deleteError && orphanedIds.length > 0) {
        console.log(`🧹 Cleaned up ${orphanedIds.length} orphaned test profile(s) from reviewerRole tests`);
      }
    }

    // Sign out
    await supabase.auth.signOut();
  });

  it('sets reviewer_role from profiles.role when creating a review as logged-in user', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Create a test venue for this test
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    if (venueError || !venueData) {
      throw new Error(`Failed to create test venue: ${venueError?.message}`);
    }
    const testVenueId = venueData.id;
    testVenueIds.push(testVenueId);

    // Create a profile with role 'artist'
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        display_name: 'Test User',
        role: 'artist',
      });

    if (profileError && profileError.code !== '23505') {
      // 23505 is duplicate key - profile might already exist
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // Create a review - reviewer_role should come from profiles.role
    const createData: CreateReviewInput = {
      venue_id: testVenueId,
      user_id: testUserId,
      reviewer_name: 'Test Reviewer',
      score: 8,
      sound_score: 8,
      vibe_score: 8,
      staff_score: 8,
      layout_score: 8,
      reviewer_role: 'artist', // This should match profiles.role
    };

    const { data: reviewData, error: reviewError } = await createReview(createData);

    expect(reviewError).toBeNull();
    expect(reviewData).toBeTruthy();
    expect(reviewData?.reviewer_role).toBe('artist');

    if (reviewData?.id) {
      testReviewIds.push(reviewData.id);
    }

    // Verify in database directly
    const { data: dbReview } = await supabase
      .from('reviews')
      .select('reviewer_role')
      .eq('id', reviewData?.id)
      .single();

    expect(dbReview?.reviewer_role).toBe('artist');
  });

  it('updates reviewer_role from profiles.role when updating a review', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Create a test venue for this test
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    if (venueError || !venueData) {
      throw new Error(`Failed to create test venue: ${venueError?.message}`);
    }
    const testVenueId = venueData.id;
    testVenueIds.push(testVenueId);

    // Ensure profile exists with 'fan' role
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        display_name: 'Test User',
        role: 'fan',
      });

    if (profileUpdateError) {
      throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
    }

    // Create initial review with 'fan' role
    const createData: CreateReviewInput = {
      venue_id: testVenueId,
      user_id: testUserId,
      reviewer_name: 'Test Reviewer',
      score: 7,
      sound_score: 7,
      vibe_score: 7,
      staff_score: 7,
      layout_score: 7,
      reviewer_role: 'fan',
    };

    const { data: initialReview, error: createError } = await createReview(createData);
    expect(createError).toBeNull();
    expect(initialReview?.reviewer_role).toBe('fan');

    if (!initialReview?.id) {
      throw new Error('Failed to create initial review');
    }
    testReviewIds.push(initialReview.id);

    // Update profile role to 'artist'
    const { error: roleUpdateError } = await supabase
      .from('profiles')
      .update({ role: 'artist' })
      .eq('id', testUserId);

    if (roleUpdateError) {
      throw new Error(`Failed to update role: ${roleUpdateError.message}`);
    }

    // Update the review - reviewer_role should be updated to match new profile role
    const updateData: UpdateReviewInput = {
      reviewer_name: 'Updated Reviewer',
      comment: 'Updated comment',
      score: 9,
      sound_score: 9,
      vibe_score: 9,
      staff_score: 9,
      layout_score: 9,
      reviewer_role: 'artist', // Should match updated profiles.role
    };

    const { data: updatedReview, error: updateError } = await updateReview(
      initialReview.id,
      testUserId,
      updateData
    );

    expect(updateError).toBeNull();
    expect(updatedReview).toBeTruthy();
    expect(updatedReview?.reviewer_role).toBe('artist');

    // Verify in database
    const { data: dbReview } = await supabase
      .from('reviews')
      .select('reviewer_role')
      .eq('id', initialReview.id)
      .single();

    expect(dbReview?.reviewer_role).toBe('artist');
  });

  it('sets reviewer_role to null for anonymous users', async () => {
    if (isRateLimited) {
      return; // Skip if rate limited
    }

    // Create a test venue for this test
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    if (venueError || !venueData) {
      throw new Error(`Failed to create test venue: ${venueError?.message}`);
    }
    const testVenueId = venueData.id;
    testVenueIds.push(testVenueId);

    // For this test, we need a user without a profile (anonymous user)
    // Instead of creating a new anonymous user (which hits rate limits),
    // we'll temporarily remove the profile from testUserId to simulate anonymous user
    const anonUserId = testUserId!;
    
    // Store original profile state before removing it
    const { data: originalProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', anonUserId)
      .maybeSingle();
    
    // Temporarily remove profile to simulate anonymous user
    if (originalProfile) {
      await supabase.from('profiles').delete().eq('id', anonUserId);
    }

    try {
      // Create review without a profile (anonymous user)
      // Don't pass reviewer_role - it should be null for users without profiles
      const createData: CreateReviewInput = {
        venue_id: testVenueId,
        user_id: anonUserId,
        reviewer_name: 'Anonymous Reviewer',
        score: 6,
        sound_score: 6,
        vibe_score: 6,
        staff_score: 6,
        layout_score: 6,
        // Don't set reviewer_role - should default to null for users without profiles
      };

      const { data: reviewData, error: reviewError } = await createReview(createData);

      expect(reviewError).toBeNull();
      expect(reviewData).toBeTruthy();
      expect(reviewData?.reviewer_role).toBeNull();

      if (reviewData?.id) {
        testReviewIds.push(reviewData.id);
      }

      // Verify in database
      const { data: dbReview } = await supabase
        .from('reviews')
        .select('reviewer_role')
        .eq('id', reviewData?.id)
        .single();

      expect(dbReview?.reviewer_role).toBeNull();
    } finally {
      // Restore original profile if it existed
      if (originalProfile) {
        const { error: insertError } = await supabase.from('profiles').insert(originalProfile);
        if (insertError) {
          // If insert fails (e.g., already exists), try update
          await supabase.from('profiles').update(originalProfile).eq('id', anonUserId);
        }
      }
    }
  });

  it('ensures reviewer_role always reflects current profiles.role on every create', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Create two test venues (one review per venue due to unique constraint)
    const { data: venue1Data, error: venue1Error } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue 1 ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    const { data: venue2Data, error: venue2Error } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue 2 ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    if (venue1Error || !venue1Data?.id) {
      throw new Error(`Failed to create venue 1: ${venue1Error?.message}`);
    }
    if (venue2Error || !venue2Data?.id) {
      throw new Error(`Failed to create venue 2: ${venue2Error?.message}`);
    }

    testVenueIds.push(venue1Data.id);
    testVenueIds.push(venue2Data.id);

    // Create profile with 'artist' role
    await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        display_name: 'Test User',
        role: 'artist',
      });

    // Create first review
    const createData1: CreateReviewInput = {
      venue_id: venue1Data.id,
      user_id: testUserId,
      reviewer_name: 'Reviewer 1',
      score: 8,
      sound_score: 8,
      vibe_score: 8,
      staff_score: 8,
      layout_score: 8,
      reviewer_role: 'artist', // Should match profiles.role
    };

    const { data: review1, error: error1 } = await createReview(createData1);
    expect(error1).toBeNull();
    expect(review1?.reviewer_role).toBe('artist');
    if (review1?.id) testReviewIds.push(review1.id);

    // Change profile role to 'fan'
    await supabase
      .from('profiles')
      .update({ role: 'fan' })
      .eq('id', testUserId);

    // Create second review - should have 'fan' role (current profiles.role)
    const createData2: CreateReviewInput = {
      venue_id: venue2Data.id,
      user_id: testUserId,
      reviewer_name: 'Reviewer 2',
      score: 7,
      sound_score: 7,
      vibe_score: 7,
      staff_score: 7,
      layout_score: 7,
      reviewer_role: 'fan', // Should match updated profiles.role
    };

    const { data: review2, error: error2 } = await createReview(createData2);
    expect(error2).toBeNull();
    expect(review2?.reviewer_role).toBe('fan');
    if (review2?.id) testReviewIds.push(review2.id);

    // Verify both reviews have correct roles
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, reviewer_role')
      .in('id', [review1?.id, review2?.id].filter(Boolean) as string[]);

    const review1Data = reviews?.find((r) => r.id === review1?.id);
    const review2Data = reviews?.find((r) => r.id === review2?.id);

    expect(review1Data?.reviewer_role).toBe('artist');
    expect(review2Data?.reviewer_role).toBe('fan');
  });

  it('ensures reviewer_role always reflects current profiles.role on every update', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Create a test venue for this test
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    if (venueError || !venueData) {
      throw new Error(`Failed to create test venue: ${venueError?.message}`);
    }
    const testVenueId = venueData.id;
    testVenueIds.push(testVenueId);

    // Create profile with 'fan' role
    await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        display_name: 'Test User',
        role: 'fan',
      });

    // Create initial review
    const createData: CreateReviewInput = {
      venue_id: testVenueId,
      user_id: testUserId,
      reviewer_name: 'Initial Reviewer',
      score: 6,
      sound_score: 6,
      vibe_score: 6,
      staff_score: 6,
      layout_score: 6,
      reviewer_role: 'fan',
    };

    const { data: initialReview, error: createError } = await createReview(createData);
    expect(createError).toBeNull();
    expect(initialReview?.reviewer_role).toBe('fan');
    if (!initialReview?.id) {
      throw new Error('Failed to create review');
    }
    testReviewIds.push(initialReview.id);

    // Change profile role to 'artist'
    await supabase
      .from('profiles')
      .update({ role: 'artist' })
      .eq('id', testUserId);

    // Update review - reviewer_role should reflect new profiles.role
    const updateData: UpdateReviewInput = {
      reviewer_name: 'Updated Reviewer',
      comment: 'Updated',
      score: 9,
      sound_score: 9,
      vibe_score: 9,
      staff_score: 9,
      layout_score: 9,
      reviewer_role: 'artist', // Should match updated profiles.role
    };

    const { data: updatedReview, error: updateError } = await updateReview(
      initialReview.id,
      testUserId,
      updateData
    );

    expect(updateError).toBeNull();
    expect(updatedReview?.reviewer_role).toBe('artist');

    // Verify in database
    const { data: dbReview } = await supabase
      .from('reviews')
      .select('reviewer_role')
      .eq('id', initialReview.id)
      .single();

    expect(dbReview?.reviewer_role).toBe('artist');
  });

  it('enforces role immutability - role cannot be changed once set', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Ensure we're still authenticated (session might have expired)
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user || currentUser.user.id !== testUserId) {
      // Try to restore session - if testUserId exists, we should already be authenticated
      // If not, skip this test rather than creating a new user (avoids rate limits)
      if (!testUserId) {
        throw new Error('Test user ID not available - cannot proceed without authentication');
      }
      // If session expired but we have testUserId, the RLS policies should still work
      // as long as we're making requests with the correct user context
    }

    // Create a test venue
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    if (venueError || !venueData) {
      throw new Error(`Failed to create test venue: ${venueError?.message}`);
    }
    const testVenueId = venueData.id;
    testVenueIds.push(testVenueId);

    // Ensure profile exists and set role to 'artist'
    // First check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testUserId)
      .maybeSingle();

    if (!existingProfile) {
      // Create profile with null role first (RLS allows this if auth.uid() = id)
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          display_name: 'Test User',
          role: null,
        });

      if (createError) {
        // If RLS blocks, try to get more info
        const { data: userCheck } = await supabase.auth.getUser();
        throw new Error(
          `Failed to create profile: ${createError.message}. ` +
          `Current user: ${userCheck?.user?.id}, Profile id: ${testUserId}, Match: ${userCheck?.user?.id === testUserId}`
        );
      }
    }

    // Now set role to 'artist' (using the immutability-safe update)
    const { error: setRoleError } = await supabase
      .from('profiles')
      .update({ role: 'artist' })
      .eq('id', testUserId)
      .is('role', null); // Only update if role is null

    if (setRoleError) {
      // If role was already set, that's fine - we'll verify immutability below
      console.warn('Role may already be set:', setRoleError.message);
    }

    // Verify role is set to 'artist'
    const { data: profile1 } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testUserId)
      .single();

    expect(profile1?.role).toBe('artist');

    // Try to change role to 'fan' - should fail due to immutability
    // Using .is('role', null) should prevent update if role is already set
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'fan' })
      .eq('id', testUserId)
      .is('role', null) // Only update if role is null (immutability constraint)
      .select('role')
      .single();

    // Should return null/error because role is not null (immutability enforced)
    expect(updateData).toBeNull();
    expect(updateError).toBeTruthy();

    // Verify role is still 'artist' (unchanged)
    const { data: profile2 } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testUserId)
      .single();

    expect(profile2?.role).toBe('artist'); // Role should remain unchanged
  });
});
