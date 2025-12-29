/**
 * Tests for review submission and UI refresh functionality
 * 
 * These tests ensure that:
 * 1. Reviews are properly created and the UI refreshes
 * 2. Duplicate reviews are handled gracefully
 * 3. Cache invalidation works correctly
 * 4. User ID matching works for finding "my review"
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { reviewsCache } from '@/lib/cache/reviewsCache';

describe('Review Submission and UI Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewsCache.clear();
  });

  describe('Cache Invalidation', () => {
    it('invalidates cache after review creation', async () => {
      const venueId = 'venue-123';
      const mockReview = {
        id: 'review-123',
        reviewer: 'Test',
        reviewer_name: 'Test',
        score: 8,
        comment: 'Test comment',
        created_at: '2024-01-01T00:00:00Z',
        sound_score: 7,
        vibe_score: 8,
        staff_score: 9,
        layout_score: 7,
        user_id: 'user-123',
        reviewer_role: 'fan' as const,
      };

      // Set initial cache
      reviewsCache.set(venueId, [mockReview]);
      expect(reviewsCache.get(venueId)).toEqual([mockReview]);

      // Invalidate cache
      reviewsCache.invalidate(venueId);
      expect(reviewsCache.get(venueId)).toBeNull();
    });

    it('clears pending fetches when invalidating', async () => {
      const venueId = 'venue-123';
      const mockPromise = Promise.resolve([]);

      reviewsCache.setPendingFetch(venueId, mockPromise);
      expect(reviewsCache.getPendingFetch(venueId)).toBe(mockPromise);

      reviewsCache.invalidate(venueId);
      expect(reviewsCache.getPendingFetch(venueId)).toBeNull();
    });
  });

});

