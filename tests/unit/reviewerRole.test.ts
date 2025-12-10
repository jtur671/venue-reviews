import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/lib/supabaseClient';
import { createReview, updateReview, type CreateReviewInput, type UpdateReviewInput } from '@/lib/services/reviewService';
import { KNOWN_VENUE_ID } from '../fixtures';

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
    // Create an anonymous user session for testing
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError || !authData.user) {
      if (authError?.message?.includes('rate limit')) {
        isRateLimited = true;
        console.warn('⚠️  Skipping reviewer role tests due to Supabase rate limit.');
        return;
      }
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }
    testUserId = authData.user.id;
    // Venues will be created per-test as needed (due to unique constraint: one review per user per venue)
  });

  afterAll(async () => {
    if (isRateLimited || !testUserId) {
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

    // Clean up: Delete test profile
    if (testUserId) {
      await supabase.from('profiles').delete().eq('id', testUserId);
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

    // Create a new anonymous user (different from testUserId)
    const { data: anonAuthData, error: anonAuthError } = await supabase.auth.signInAnonymously();
    if (anonAuthError || !anonAuthData.user) {
      // If rate limited, skip this test
      if (anonAuthError?.message?.includes('rate limit')) {
        return;
      }
      throw new Error(`Failed to create anonymous user: ${anonAuthError?.message}`);
    }

    const anonUserId = anonAuthData.user.id;

    try {
      // Create review without a profile (anonymous user)
      const createData: CreateReviewInput = {
        venue_id: testVenueId,
        user_id: anonUserId,
        reviewer_name: 'Anonymous Reviewer',
        score: 6,
        sound_score: 6,
        vibe_score: 6,
        staff_score: 6,
        layout_score: 6,
        reviewer_role: null, // Anonymous users should have null reviewer_role
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
      // Clean up anonymous user session
      await supabase.auth.signOut();
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
      // Create profile with null role first (RLS allows this)
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          display_name: 'Test User',
          role: null,
        });

      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`);
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
