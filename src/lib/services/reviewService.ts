import { supabase } from '@/lib/supabaseClient';
import { Review } from '@/types/venues';

export type CreateReviewInput = {
  venue_id: string;
  user_id: string;
  reviewer_name?: string | null;
  comment?: string | null;
  score: number;
  sound_score: number;
  vibe_score: number;
  staff_score: number;
  layout_score: number;
};

export type UpdateReviewInput = {
  reviewer_name?: string | null;
  comment?: string | null;
  score: number;
  sound_score: number;
  vibe_score: number;
  staff_score: number;
  layout_score: number;
};

export type ReviewServiceError = {
  code?: string;
  message: string;
  isDuplicate?: boolean;
};

/**
 * Get all reviews for a venue
 */
export async function getReviewsByVenueId(venueId: string): Promise<{
  data: Review[] | null;
  error: ReviewServiceError | null;
}> {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      'id, reviewer: reviewer_name, score, comment, created_at, sound_score, vibe_score, staff_score, layout_score, user_id'
    )
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading reviews:', error);
    return {
      data: null,
      error: {
        code: error.code,
        message: 'Failed to load reviews',
      },
    };
  }

  return { data: (data || []) as Review[], error: null };
}

/**
 * Create a new review
 */
export async function createReview(input: CreateReviewInput): Promise<{
  data: Review | null;
  error: ReviewServiceError | null;
}> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      venue_id: input.venue_id,
      user_id: input.user_id,
      reviewer_name: input.reviewer_name?.trim() || null,
      comment: input.comment?.trim() || null,
      score: input.score,
      sound_score: input.sound_score,
      vibe_score: input.vibe_score,
      staff_score: input.staff_score,
      layout_score: input.layout_score,
    })
    .select('id, reviewer: reviewer_name, score, comment, created_at, sound_score, vibe_score, staff_score, layout_score, user_id')
    .single();

  if (error) {
    console.error('Error creating review:', error);
    const isDuplicate = error.code === '23505';
    return {
      data: null,
      error: {
        code: error.code,
        message: isDuplicate
          ? "You've already left a report card for this venue from this browser."
          : 'Failed to create review',
        isDuplicate,
      },
    };
  }

  return { data: data as Review, error: null };
}

/**
 * Update an existing review
 */
export async function updateReview(
  id: string,
  userId: string,
  input: UpdateReviewInput
): Promise<{
  data: Review | null;
  error: ReviewServiceError | null;
}> {
  const { data, error } = await supabase
    .from('reviews')
    .update({
      reviewer_name: input.reviewer_name?.trim() || null,
      comment: input.comment?.trim() || null,
      score: input.score,
      sound_score: input.sound_score,
      vibe_score: input.vibe_score,
      staff_score: input.staff_score,
      layout_score: input.layout_score,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, reviewer: reviewer_name, score, comment, created_at, sound_score, vibe_score, staff_score, layout_score, user_id')
    .single();

  if (error) {
    console.error('Error updating review:', error);
    return {
      data: null,
      error: {
        code: error.code,
        message: 'Failed to update review',
      },
    };
  }

  return { data: data as Review, error: null };
}

/**
 * Delete a review
 */
export async function deleteReview(
  id: string,
  userId: string
): Promise<{
  error: ReviewServiceError | null;
}> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting review:', error);
    return {
      error: {
        code: error.code,
        message: 'Failed to delete review',
      },
    };
  }

  return { error: null };
}
