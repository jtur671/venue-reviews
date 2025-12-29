import { supabase } from '@/lib/supabaseClient';
import { Review } from '@/types/venues';
import { __shouldUseApiRouteInternal, fetchFromApi, deleteFromApi } from './fetchHelpers';

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
  reviewer_role?: 'artist' | 'fan' | null;
};

export type UpdateReviewInput = {
  reviewer_name?: string | null;
  comment?: string | null;
  score: number;
  sound_score: number;
  vibe_score: number;
  staff_score: number;
  layout_score: number;
  reviewer_role?: 'artist' | 'fan' | null;
};

export type ReviewServiceError = {
  code?: string;
  message: string;
  isDuplicate?: boolean;
};

/**
 * Get all reviews for a venue.
 * Uses API route in browser (avoids Supabase auth issues), direct Supabase in SSR/tests.
 */
export async function getReviewsByVenueId(venueId: string): Promise<{
  data: Review[] | null;
  error: ReviewServiceError | null;
}> {
  try {
    // Browser → API route (no auth issues)
    if (__shouldUseApiRouteInternal()) {
      const result = await fetchFromApi<Review[]>(`/api/reviews/by-venue/${venueId}`, {
        errorMessage: 'Failed to load reviews',
        headers: { 'cache-control': 'no-cache' }, // Bypass Next.js cache when fetching
      });
      return { data: result.data || [], error: result.error };
    }

    // SSR/Tests → Direct Supabase
    const { data, error } = await supabase
      .from('reviews')
      .select(
        'id, reviewer: reviewer_name, score, comment, created_at, sound_score, vibe_score, staff_score, layout_score, user_id, reviewer_role'
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
  } catch (err) {
    console.error('Unexpected error loading reviews:', err);
    return {
      data: null,
      error: {
        message: 'Failed to load reviews',
      },
    };
  }
}

/**
 * Create a new review
 * Uses API route in browser (avoids Supabase auth issues), direct Supabase in SSR/tests.
 * 
 * IMPORTANT: For logged-in users, reviewer_role MUST be set from profiles.role.
 * The caller (ReviewForm) is responsible for fetching the current profile and passing reviewer_role.
 * This ensures that every review reflects the user's current role at the time of creation.
 */
export async function createReview(input: CreateReviewInput): Promise<{
  data: Review | null;
  error: ReviewServiceError | null;
}> {
  // reviewer_role should come from profiles.role for logged-in users
  // For anonymous users, it will be null
  const reviewerRole = input.reviewer_role ?? null;

  try {
    // Browser → API route (no auth issues)
    if (__shouldUseApiRouteInternal()) {
      const result = await fetchFromApi<Review>('/api/reviews', {
        method: 'POST',
        body: {
          venue_id: input.venue_id,
          user_id: input.user_id,
          reviewer_name: input.reviewer_name?.trim() || null,
          comment: input.comment?.trim() || null,
          score: input.score,
          sound_score: input.sound_score,
          vibe_score: input.vibe_score,
          staff_score: input.staff_score,
          layout_score: input.layout_score,
          reviewer_role: reviewerRole,
        },
        errorMessage: 'Failed to create review',
      });

      if (result.error) {
        return {
          data: null,
          error: {
            code: result.error.code,
            message: result.error.message,
            isDuplicate: result.error.isDuplicate,
          },
        };
      }

      return { data: result.data, error: null };
    }

    // SSR/Tests → Direct Supabase
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
        reviewer_role: reviewerRole,
      })
      .select(
        'id, reviewer: reviewer_name, score, comment, created_at, sound_score, vibe_score, staff_score, layout_score, user_id, reviewer_role'
      )
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
  } catch (err) {
    console.error('Unexpected error creating review:', err);
    return {
      data: null,
      error: {
        message: 'Failed to create review',
      },
    };
  }
}

/**
 * Update an existing review
 * Uses API route in browser (avoids Supabase auth issues), direct Supabase in SSR/tests.
 * 
 * IMPORTANT: reviewer_role should be updated from profiles.role for logged-in users.
 * This ensures that if a user changes their role, updating their review will reflect the new role.
 */
export async function updateReview(
  id: string,
  userId: string,
  input: UpdateReviewInput
): Promise<{
  data: Review | null;
  error: ReviewServiceError | null;
}> {
  // reviewer_role should come from profiles.role for logged-in users
  // This ensures reviews always reflect the user's current role
  const reviewerRole = input.reviewer_role ?? null;

  try {
    // Browser → API route (no auth issues)
    if (__shouldUseApiRouteInternal()) {
      const result = await fetchFromApi<Review>(`/api/reviews/${id}`, {
        method: 'PUT',
        body: {
          user_id: userId,
          reviewer_name: input.reviewer_name?.trim() || null,
          comment: input.comment?.trim() || null,
          score: input.score,
          sound_score: input.sound_score,
          vibe_score: input.vibe_score,
          staff_score: input.staff_score,
          layout_score: input.layout_score,
          reviewer_role: reviewerRole,
        },
        errorMessage: 'Failed to update review',
      });

      if (result.error) {
        return {
          data: null,
          error: {
            code: result.error.code,
            message: result.error.message,
          },
        };
      }

      return { data: result.data, error: null };
    }

    // SSR/Tests → Direct Supabase
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
        reviewer_role: reviewerRole,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(
        'id, reviewer: reviewer_name, score, comment, created_at, sound_score, vibe_score, staff_score, layout_score, user_id, reviewer_role'
      )
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
  } catch (err) {
    console.error('Unexpected error updating review:', err);
    return {
      data: null,
      error: {
        message: 'Failed to update review',
      },
    };
  }
}

/**
 * Delete a review
 * Uses API route in browser (avoids Supabase auth issues), direct Supabase in SSR/tests.
 */
export async function deleteReview(
  id: string,
  userId: string
): Promise<{
  error: ReviewServiceError | null;
}> {
  try {
    // Browser → API route (no auth issues)
    if (__shouldUseApiRouteInternal()) {
      const result = await deleteFromApi(`/api/reviews/${id}?user_id=${encodeURIComponent(userId)}`, {
        errorMessage: 'Failed to delete review',
      });

      return { error: result.error };
    }

    // SSR/Tests → Direct Supabase
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
  } catch (err) {
    console.error('Unexpected error deleting review:', err);
    return {
      error: {
        message: 'Failed to delete review',
      },
    };
  }
}
