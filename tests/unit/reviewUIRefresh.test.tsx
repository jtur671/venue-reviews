/**
 * Tests for review UI refresh functionality
 * 
 * These tests ensure that:
 * 1. Reviews are properly displayed after creation
 * 2. User ID matching works correctly
 * 3. Refetch triggers properly
 * 4. Cache invalidation updates the UI
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReviews } from '@/hooks/useReviews';
import { getReviewsByVenueId } from '@/lib/services/reviewService';
import { reviewsCache } from '@/lib/cache/reviewsCache';

// Mock dependencies
vi.mock('@/lib/services/reviewService', () => ({
  getReviewsByVenueId: vi.fn(),
}));

vi.mock('@/lib/cache/reviewsCache', () => ({
  reviewsCache: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    getPendingFetch: vi.fn(),
    setPendingFetch: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('Review UI Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (reviewsCache.get as any).mockReturnValue(null);
    (reviewsCache.getPendingFetch as any).mockReturnValue(null);
  });

  describe('useReviews Hook', () => {
    it('finds myReview when user_id matches', async () => {
      const venueId = 'venue-123';
      const viewerUserId = 'user-123';
      
      const mockReviews = [
        {
          id: 'review-1',
          user_id: 'user-456',
          score: 8,
          reviewer_name: 'Other User',
          comment: 'Other comment',
          created_at: '2024-01-01T00:00:00Z',
          sound_score: 7,
          vibe_score: 8,
          staff_score: 9,
          layout_score: 7,
          reviewer_role: 'fan' as const,
        },
        {
          id: 'review-2',
          user_id: 'user-123', // This matches viewerUserId
          score: 9,
          reviewer_name: 'My Review',
          comment: 'My comment',
          created_at: '2024-01-02T00:00:00Z',
          sound_score: 8,
          vibe_score: 9,
          staff_score: 9,
          layout_score: 9,
          reviewer_role: 'artist' as const,
        },
      ];

      (getReviewsByVenueId as any).mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      const { result } = renderHook(() => useReviews(venueId, viewerUserId));

      await waitFor(() => {
        expect(result.current.reviews.length).toBe(2);
      });

      expect(result.current.myReview).toBeDefined();
      expect(result.current.myReview?.id).toBe('review-2');
      expect(result.current.myReview?.user_id).toBe('user-123');
      expect(result.current.otherReviews.length).toBe(1);
      expect(result.current.otherReviews[0].id).toBe('review-1');
    });

    it('returns null for myReview when user_id does not match', async () => {
      const venueId = 'venue-123';
      const viewerUserId = 'user-123';
      
      const mockReviews = [
        {
          id: 'review-1',
          user_id: 'user-456',
          score: 8,
          reviewer_name: 'Other User',
          comment: 'Other comment',
          created_at: '2024-01-01T00:00:00Z',
          sound_score: 7,
          vibe_score: 8,
          staff_score: 9,
          layout_score: 7,
          reviewer_role: 'fan' as const,
        },
      ];

      (getReviewsByVenueId as any).mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      const { result } = renderHook(() => useReviews(venueId, viewerUserId));

      await waitFor(() => {
        expect(result.current.reviews.length).toBe(1);
      });

      expect(result.current.myReview).toBeNull();
      expect(result.current.otherReviews.length).toBe(1);
    });

    it('handles null user_id in reviews', async () => {
      const venueId = 'venue-123';
      const viewerUserId = 'user-123';
      
      const mockReviews = [
        {
          id: 'review-1',
          user_id: null, // Anonymous review
          score: 8,
          reviewer_name: 'Anonymous',
          comment: 'Anonymous comment',
          created_at: '2024-01-01T00:00:00Z',
          sound_score: 7,
          vibe_score: 8,
          staff_score: 9,
          layout_score: 7,
          reviewer_role: null,
        },
        {
          id: 'review-2',
          user_id: 'user-123',
          score: 9,
          reviewer_name: 'My Review',
          comment: 'My comment',
          created_at: '2024-01-02T00:00:00Z',
          sound_score: 8,
          vibe_score: 9,
          staff_score: 9,
          layout_score: 9,
          reviewer_role: 'fan' as const,
        },
      ];

      (getReviewsByVenueId as any).mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      const { result } = renderHook(() => useReviews(venueId, viewerUserId));

      await waitFor(() => {
        expect(result.current.reviews.length).toBe(2);
      });

      expect(result.current.myReview).toBeDefined();
      expect(result.current.myReview?.id).toBe('review-2');
      expect(result.current.otherReviews.length).toBe(1);
      expect(result.current.otherReviews[0].id).toBe('review-1');
    });

    it('refetches reviews when refetch is called', async () => {
      const venueId = 'venue-123';
      const viewerUserId = 'user-123';
      
      const initialReviews = [
        {
          id: 'review-1',
          user_id: 'user-123',
          score: 8,
          reviewer_name: 'Initial Review',
          comment: 'Initial comment',
          created_at: '2024-01-01T00:00:00Z',
          sound_score: 7,
          vibe_score: 8,
          staff_score: 9,
          layout_score: 7,
          reviewer_role: 'fan' as const,
        },
      ];

      const updatedReviews = [
        ...initialReviews,
        {
          id: 'review-2',
          user_id: 'user-456',
          score: 9,
          reviewer_name: 'New Review',
          comment: 'New comment',
          created_at: '2024-01-02T00:00:00Z',
          sound_score: 8,
          vibe_score: 9,
          staff_score: 9,
          layout_score: 9,
          reviewer_role: 'artist' as const,
        },
      ];

      (getReviewsByVenueId as any)
        .mockResolvedValueOnce({
          data: initialReviews,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedReviews,
          error: null,
        });

      (reviewsCache.invalidate as any).mockImplementation(() => {
        (reviewsCache.get as any).mockReturnValue(null);
      });

      const { result } = renderHook(() => useReviews(venueId, viewerUserId));

      await waitFor(() => {
        expect(result.current.reviews.length).toBe(1);
      });

      // Call refetch
      result.current.refetch();

      await waitFor(() => {
        expect(result.current.reviews.length).toBe(2);
      });

      expect(reviewsCache.invalidate).toHaveBeenCalledWith(venueId);
      expect(getReviewsByVenueId).toHaveBeenCalledTimes(2);
    });

    it('handles refetch errors gracefully', async () => {
      const venueId = 'venue-123';
      const viewerUserId = 'user-123';
      
      const initialReviews = [
        {
          id: 'review-1',
          user_id: 'user-123',
          score: 8,
          reviewer_name: 'Initial Review',
          comment: 'Initial comment',
          created_at: '2024-01-01T00:00:00Z',
          sound_score: 7,
          vibe_score: 8,
          staff_score: 9,
          layout_score: 7,
          reviewer_role: 'fan' as const,
        },
      ];

      (getReviewsByVenueId as any)
        .mockResolvedValueOnce({
          data: initialReviews,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Failed to load reviews' },
        });

      (reviewsCache.invalidate as any).mockImplementation(() => {
        (reviewsCache.get as any).mockReturnValue(null);
      });

      const { result } = renderHook(() => useReviews(venueId, viewerUserId));

      await waitFor(() => {
        expect(result.current.reviews.length).toBe(1);
      });

      // Call refetch
      result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBeTruthy();
      if (result.current.error) {
        expect(result.current.error).toContain('Failed to load reviews');
      }
    });
  });

  describe('Cache Behavior', () => {
    it('uses cached reviews when available', async () => {
      const venueId = 'venue-123';
      const viewerUserId = 'user-123';
      
      const cachedReviews = [
        {
          id: 'review-1',
          user_id: 'user-123',
          score: 8,
          reviewer_name: 'Cached Review',
          comment: 'Cached comment',
          created_at: '2024-01-01T00:00:00Z',
          sound_score: 7,
          vibe_score: 8,
          staff_score: 9,
          layout_score: 7,
          reviewer_role: 'fan' as const,
        },
      ];

      (reviewsCache.get as any).mockReturnValue(cachedReviews);

      const { result } = renderHook(() => useReviews(venueId, viewerUserId));

      // Should immediately have cached reviews (may need to wait for state update)
      await waitFor(() => {
        expect(result.current.reviews.length).toBeGreaterThan(0);
      });
      
      // Loading might still be true initially while fetching in background
      // The important thing is that cached reviews are shown
      expect(result.current.reviews).toEqual(cachedReviews);
      
      // Should still fetch in background
      await waitFor(() => {
        expect(getReviewsByVenueId).toHaveBeenCalled();
      });
    });

    it('bypasses cache when force refresh is requested', async () => {
      const venueId = 'venue-123';
      const viewerUserId = 'user-123';
      
      const cachedReviews = [
        {
          id: 'review-1',
          user_id: 'user-123',
          score: 8,
          reviewer_name: 'Cached Review',
          comment: 'Cached comment',
          created_at: '2024-01-01T00:00:00Z',
          sound_score: 7,
          vibe_score: 8,
          staff_score: 9,
          layout_score: 7,
          reviewer_role: 'fan' as any,
        },
      ];

      const freshReviews = [
        {
          id: 'review-2',
          user_id: 'user-123',
          score: 9,
          reviewer_name: 'Fresh Review',
          comment: 'Fresh comment',
          created_at: '2024-01-02T00:00:00Z',
          sound_score: 8,
          vibe_score: 9,
          staff_score: 9,
          layout_score: 9,
          reviewer_role: 'fan' as const,
        },
      ];

      (reviewsCache.get as any).mockReturnValue(cachedReviews);
      (getReviewsByVenueId as any).mockResolvedValue({
        data: freshReviews,
        error: null,
      });

      (reviewsCache.invalidate as any).mockImplementation(() => {
        (reviewsCache.get as any).mockReturnValue(null);
      });

      const { result } = renderHook(() => useReviews(venueId, viewerUserId));

      // Call refetch which should force refresh
      result.current.refetch();

      await waitFor(() => {
        expect(result.current.reviews.length).toBe(1);
        expect(result.current.reviews[0].id).toBe('review-2');
      });
    });
  });
});

