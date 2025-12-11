import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/lib/supabaseClient';

describe('Review CRUD Operations', () => {
  let testVenueId: string | null = null;

  beforeAll(async () => {
    // Create a test venue for these tests
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
    testVenueId = venueData.id;
  });

  afterAll(async () => {
    // Clean up test venue
    if (testVenueId) {
      await supabase.from('venues').delete().eq('id', testVenueId);
    }
  });

  it('can create, update, and delete a review', async () => {
    if (!testVenueId) {
      throw new Error('Test venue not created');
    }

    const uniqueComment = `Test review ${Date.now()}`;
    const updatedComment = `Updated review ${Date.now()}`;

    // 1. Create a review
    const { data: insertData, error: insertError } = await supabase
      .from('reviews')
      .insert({
        venue_id: testVenueId,
        reviewer_name: 'Test Reviewer',
        score: 8,
        sound_score: 8,
        vibe_score: 7,
        staff_score: 9,
        layout_score: 8,
        comment: uniqueComment,
      })
      .select('id, reviewer_name, score, comment, sound_score, vibe_score, staff_score, layout_score')
      .single();

    expect(insertError).toBeNull();
    expect(insertData?.id).toBeTruthy();
    expect(insertData?.comment).toBe(uniqueComment);
    expect(insertData?.score).toBe(8);
    expect(insertData?.sound_score).toBe(8);
    expect(insertData?.vibe_score).toBe(7);
    expect(insertData?.staff_score).toBe(9);
    expect(insertData?.layout_score).toBe(8);

    if (!insertData?.id) {
      throw new Error('Failed to create review');
    }

    const reviewId = insertData.id;

    // 2. Update the review
    const { data: updateData, error: updateError } = await supabase
      .from('reviews')
      .update({
        comment: updatedComment,
        score: 9,
        sound_score: 9,
        vibe_score: 8,
        staff_score: 9,
        layout_score: 9,
      })
      .eq('id', reviewId)
      .select('id, reviewer_name, score, comment, sound_score, vibe_score, staff_score, layout_score')
      .single();

    expect(updateError).toBeNull();
    expect(updateData?.id).toBe(reviewId);
    expect(updateData?.comment).toBe(updatedComment);
    expect(updateData?.score).toBe(9);
    expect(updateData?.sound_score).toBe(9);
    expect(updateData?.vibe_score).toBe(8);
    expect(updateData?.staff_score).toBe(9);
    expect(updateData?.layout_score).toBe(9);

    // 3. Verify the update persisted by fetching again
    const { data: fetchedData, error: fetchError } = await supabase
      .from('reviews')
      .select('id, comment, score, sound_score, vibe_score, staff_score, layout_score')
      .eq('id', reviewId)
      .single();

    expect(fetchError).toBeNull();
    expect(fetchedData?.comment).toBe(updatedComment);
    expect(fetchedData?.score).toBe(9);
    expect(fetchedData?.sound_score).toBe(9);
    expect(fetchedData?.vibe_score).toBe(8);
    expect(fetchedData?.staff_score).toBe(9);
    expect(fetchedData?.layout_score).toBe(9);

    // 4. Clean up - delete the review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    expect(deleteError).toBeNull();

    // 5. Verify deletion
    const { data: deletedData, error: verifyError } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .single();

    expect(verifyError).not.toBeNull();
    expect(deletedData).toBeNull();
  });

  it('can update only specific fields without affecting others', async () => {
    if (!testVenueId) {
      throw new Error('Test venue not created');
    }

    const initialComment = `Initial comment ${Date.now()}`;
    const updatedComment = `Updated comment ${Date.now()}`;

    // Create a review
    const { data: insertData, error: insertError } = await supabase
      .from('reviews')
      .insert({
        venue_id: testVenueId,
        reviewer_name: 'Test Reviewer',
        score: 7,
        sound_score: 7,
        vibe_score: 7,
        staff_score: 7,
        layout_score: 7,
        comment: initialComment,
      })
      .select('id, score, sound_score, vibe_score, staff_score, layout_score, comment')
      .single();

    expect(insertError).toBeNull();
    if (!insertData?.id) {
      throw new Error('Failed to create review');
    }

    const reviewId = insertData.id;
    const originalScore = insertData.score;
    const originalSoundScore = insertData.sound_score;

    // Update only the comment
    const { data: updateData, error: updateError } = await supabase
      .from('reviews')
      .update({
        comment: updatedComment,
      })
      .eq('id', reviewId)
      .select('id, score, sound_score, vibe_score, staff_score, layout_score, comment')
      .single();

    expect(updateError).toBeNull();
    expect(updateData?.comment).toBe(updatedComment);
    // Verify other fields remain unchanged
    expect(updateData?.score).toBe(originalScore);
    expect(updateData?.sound_score).toBe(originalSoundScore);

    // Clean up
    await supabase.from('reviews').delete().eq('id', reviewId);
  });

  it('stores and retrieves aspect scores correctly', async () => {
    if (!testVenueId) {
      throw new Error('Test venue not created');
    }

    const soundScore = 8;
    const vibeScore = 7;
    const staffScore = 9;
    const layoutScore = 8;
    const calculatedScore = Math.round((soundScore + vibeScore + staffScore + layoutScore) / 4); // = 8

    const { data: insertData, error: insertError } = await supabase
      .from('reviews')
      .insert({
        venue_id: testVenueId,
        reviewer_name: 'Test Reviewer',
        score: calculatedScore,
        sound_score: soundScore,
        vibe_score: vibeScore,
        staff_score: staffScore,
        layout_score: layoutScore,
        comment: 'Test comment',
      })
      .select('id, score, sound_score, vibe_score, staff_score, layout_score')
      .single();

    expect(insertError).toBeNull();
    if (!insertData?.id) {
      throw new Error('Failed to create review');
    }

    // Verify all scores are stored correctly
    expect(insertData?.score).toBe(calculatedScore);
    expect(insertData?.sound_score).toBe(soundScore);
    expect(insertData?.vibe_score).toBe(vibeScore);
    expect(insertData?.staff_score).toBe(staffScore);
    expect(insertData?.layout_score).toBe(layoutScore);

    // Verify scores persist after fetch
    const { data: fetchedData, error: fetchError } = await supabase
      .from('reviews')
      .select('score, sound_score, vibe_score, staff_score, layout_score')
      .eq('id', insertData.id)
      .single();

    expect(fetchError).toBeNull();
    expect(fetchedData?.score).toBe(calculatedScore);
    expect(fetchedData?.sound_score).toBe(soundScore);
    expect(fetchedData?.vibe_score).toBe(vibeScore);
    expect(fetchedData?.staff_score).toBe(staffScore);
    expect(fetchedData?.layout_score).toBe(layoutScore);

    // Clean up
    await supabase.from('reviews').delete().eq('id', insertData.id);
  });
});
