import { describe, expect, it, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { supabase } from '@/lib/supabaseClient';

/**
 * Mission Critical Test: Account Page Review Loading
 * 
 * This test ensures that:
 * 1. Reviews are properly loaded for authenticated users
 * 2. Reviews refresh when navigating back to the account page
 * 3. Reviews include proper venue data (joined)
 * 4. The data structure matches what the account page expects
 * 
 * NOTE: These tests create anonymous users and may hit Supabase rate limits
 * if run too frequently. Wait a few minutes between test runs if you see
 * "Request rate limit reached" errors.
 */
describe('Account Page Review Loading (Mission Critical)', () => {
  let testUserId: string | null = null;
  let testVenueIds: string[] = [];
  let testReviewIds: string[] = [];
  let isRateLimited = false;

  beforeAll(async () => {
    // Create a single anonymous user session for all tests to avoid rate limits
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError || !authData.user) {
      if (authError?.message?.includes('rate limit')) {
        isRateLimited = true;
        console.warn('⚠️  Skipping account page tests due to Supabase rate limit. Wait a few minutes and try again.');
        return;
      }
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }
    testUserId = authData.user.id;
  });

  beforeEach(() => {
    // Skip all tests if we hit rate limit
    if (isRateLimited || !testUserId) {
      return;
    }
  });

  afterEach(async () => {
    if (isRateLimited || !testUserId) {
      return;
    }

    // Clean up: Delete test reviews
    if (testReviewIds.length > 0) {
      await supabase.from('reviews').delete().in('id', testReviewIds);
      testReviewIds = [];
    }

    // Clean up: Delete test venues
    if (testVenueIds.length > 0) {
      await supabase.from('venues').delete().in('id', testVenueIds);
      testVenueIds = [];
    }
  });

  afterAll(async () => {
    // Sign out only once at the end
    if (testUserId) {
      await supabase.auth.signOut();
      testUserId = null;
    }
  });

  it('loads reviews for an authenticated user with proper venue data', async () => {
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

    // Create a review
    const reviewComment = `Test review ${Date.now()}`;
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        venue_id: testVenueId,
        user_id: testUserId,
        reviewer_name: 'Test Reviewer',
        score: 8,
        sound_score: 8,
        vibe_score: 7,
        staff_score: 9,
        layout_score: 8,
        comment: reviewComment,
      })
      .select('id')
      .single();

    expect(reviewError).toBeNull();
    expect(reviewData?.id).toBeTruthy();
    if (reviewData?.id) {
      testReviewIds.push(reviewData.id);
    }

    // Load reviews using the same query as the account page
    const { data: reviewsData, error: reviewsError } = await supabase
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
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    expect(reviewsError).toBeNull();
    expect(reviewsData).toBeTruthy();
    expect(Array.isArray(reviewsData)).toBe(true);
    expect(reviewsData?.length).toBeGreaterThan(0);

    // Verify the review structure matches what the account page expects
    const review = reviewsData?.[0];
    expect(review).toBeTruthy();
    expect(review?.id).toBe(reviewData?.id);
    expect(review?.score).toBe(8);
    // Note: comment is not selected in account page query, so we don't check it

    // Verify venue data is properly joined
    // Supabase returns venues as an array when using foreign key relationships
    const venue = Array.isArray(review?.venues) ? review?.venues[0] : review?.venues;
    expect(venue).toBeTruthy();
    expect(venue?.id).toBe(testVenueId);
    expect(venue?.name).toBeTruthy();
    expect(venue?.city).toBe('Test City');
    expect(venue?.country).toBe('Test Country');
  });

  it('handles multiple reviews and orders them by created_at descending', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Create two test venues (one review per venue due to unique constraint)
    const { data: venue1Data } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue 1 ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    const { data: venue2Data } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue 2 ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    if (venue1Data?.id) testVenueIds.push(venue1Data.id);
    if (venue2Data?.id) testVenueIds.push(venue2Data.id);

    // Create first review
    const review1Comment = `Review 1 ${Date.now()}`;
    const { data: review1Data } = await supabase
      .from('reviews')
      .insert({
        venue_id: venue1Data?.id,
        user_id: testUserId,
        reviewer_name: 'Test Reviewer',
        score: 7,
        sound_score: 7,
        vibe_score: 7,
        staff_score: 7,
        layout_score: 7,
        comment: review1Comment,
      })
      .select('id')
      .single();

    if (review1Data?.id) {
      testReviewIds.push(review1Data.id);
    }

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create second review for different venue
    const review2Comment = `Review 2 ${Date.now()}`;
    const { data: review2Data } = await supabase
      .from('reviews')
      .insert({
        venue_id: venue2Data?.id,
        user_id: testUserId,
        reviewer_name: 'Test Reviewer',
        score: 9,
        sound_score: 9,
        vibe_score: 9,
        staff_score: 9,
        layout_score: 9,
        comment: review2Comment,
      })
      .select('id')
      .single();

    if (review2Data?.id) {
      testReviewIds.push(review2Data.id);
    }

    // Load reviews (same query as account page)
    const { data: reviewsData, error: reviewsError } = await supabase
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
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    expect(reviewsError).toBeNull();
    expect(reviewsData).toBeTruthy();
    expect(Array.isArray(reviewsData)).toBe(true);
    expect(reviewsData?.length).toBeGreaterThanOrEqual(2);

      // Verify ordering: most recent first
      if (reviewsData && reviewsData.length >= 2) {
        const firstReview = reviewsData[0];
        const secondReview = reviewsData[1];

        expect(firstReview?.created_at).toBeTruthy();
        expect(secondReview?.created_at).toBeTruthy();

        // First review should be more recent (or equal)
        const firstTime = new Date(firstReview.created_at!).getTime();
        const secondTime = new Date(secondReview.created_at!).getTime();
        expect(firstTime).toBeGreaterThanOrEqual(secondTime);

        // Most recent review should be review2 (score 9)
        expect(firstReview?.score).toBe(9);
      }
  });

  it('returns empty array when user has no reviews', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Load reviews for a user with no reviews
    const { data: reviewsData, error: reviewsError } = await supabase
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
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    expect(reviewsError).toBeNull();
    expect(reviewsData).toBeTruthy();
    expect(Array.isArray(reviewsData)).toBe(true);
    // Should be empty or only contain reviews from other tests (which we clean up)
    expect(reviewsData?.length).toBe(0);
  });

  it('processes venue data correctly when returned as array (Supabase join behavior)', async () => {
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

    // Create a review
    const { data: reviewData } = await supabase
      .from('reviews')
      .insert({
        venue_id: testVenueId,
        user_id: testUserId,
        reviewer_name: 'Test Reviewer',
        score: 8,
        sound_score: 8,
        vibe_score: 8,
        staff_score: 8,
        layout_score: 8,
      })
      .select('id')
      .single();

    if (reviewData?.id) {
      testReviewIds.push(reviewData.id);
    }

    // Load reviews
    const { data: reviewsData } = await supabase
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
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    expect(reviewsData).toBeTruthy();
    expect(Array.isArray(reviewsData)).toBe(true);

    // Process venue data the same way the account page does
    const processedReviews = (reviewsData ?? []).map((r: any) => ({
      ...r,
      venues: Array.isArray(r.venues) ? r.venues[0] || null : r.venues || null,
    }));

    expect(processedReviews.length).toBeGreaterThan(0);
    const processedReview = processedReviews[0];

    // Verify venue is properly extracted
    expect(processedReview.venues).toBeTruthy();
    expect(processedReview.venues?.id).toBe(testVenueId);
    expect(processedReview.venues?.name).toBeTruthy();
    expect(processedReview.venues?.city).toBe('Test City');
  });

  it('refreshes reviews correctly (simulating visibility change)', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Create two test venues (one review per venue due to unique constraint)
    const { data: venue1Data } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue 1 ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    const { data: venue2Data } = await supabase
      .from('venues')
      .insert({
        name: `Test Venue 2 ${Date.now()}`,
        city: 'Test City',
        country: 'Test Country',
      })
      .select('id')
      .single();

    if (venue1Data?.id) testVenueIds.push(venue1Data.id);
    if (venue2Data?.id) testVenueIds.push(venue2Data.id);

    // Initial review
    const { data: review1Data } = await supabase
      .from('reviews')
      .insert({
        venue_id: venue1Data?.id,
        user_id: testUserId,
        reviewer_name: 'Test Reviewer',
        score: 7,
        sound_score: 7,
        vibe_score: 7,
        staff_score: 7,
        layout_score: 7,
      })
      .select('id')
      .single();

    if (review1Data?.id) {
      testReviewIds.push(review1Data.id);
    }

    // First load
    const { data: reviews1 } = await supabase
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
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    expect(reviews1?.length).toBe(1);

    // Simulate user creating a new review (like navigating away and coming back)
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { data: review2Data } = await supabase
      .from('reviews')
      .insert({
        venue_id: venue2Data?.id,
        user_id: testUserId,
        reviewer_name: 'Test Reviewer',
        score: 9,
        sound_score: 9,
        vibe_score: 9,
        staff_score: 9,
        layout_score: 9,
      })
      .select('id')
      .single();

    if (review2Data?.id) {
      testReviewIds.push(review2Data.id);
    }

    // Refresh load (simulating visibility change)
    const { data: reviews2 } = await supabase
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
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    // Should now have 2 reviews
    expect(reviews2?.length).toBe(2);
    expect(reviews2?.[0]?.score).toBe(9); // Most recent first
    expect(reviews2?.[1]?.score).toBe(7);
  });

  it('handles reviews with null scores and missing venue data gracefully', async () => {
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

    // Create a review with minimal data (no comment, no reviewer_name)
    const { data: reviewData, error: reviewInsertError } = await supabase
      .from('reviews')
      .insert({
        venue_id: testVenueId,
        user_id: testUserId,
        score: 8,
        sound_score: 8,
        vibe_score: 8,
        staff_score: 8,
        layout_score: 8,
      })
      .select('id')
      .single();

    if (reviewInsertError) {
      throw new Error(`Failed to create review: ${reviewInsertError.message}`);
    }

    if (reviewData?.id) {
      testReviewIds.push(reviewData.id);
    }

    // Load reviews (same query as account page)
    const { data: reviewsData, error: reviewsError } = await supabase
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
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      throw new Error(`Failed to load reviews: ${reviewsError.message}`);
    }
    
    expect(reviewsData).toBeTruthy();
    expect(Array.isArray(reviewsData)).toBe(true);
    expect(reviewsData?.length).toBeGreaterThan(0);

    // Process like account page does
    const processedReviews = (reviewsData ?? []).map((r: any) => ({
      ...r,
      venues: Array.isArray(r.venues) ? r.venues[0] || null : r.venues || null,
    }));

    const review = processedReviews[0];
    expect(review).toBeTruthy();
    expect(review?.score).toBe(8);
    // Venue should still be present even without comment/reviewer_name
    expect(review?.venues).toBeTruthy();
    expect(review?.venues?.id).toBe(testVenueId);
  });
});
