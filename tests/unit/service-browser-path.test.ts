/**
 * Tests for the browser path of service functions.
 * 
 * These tests verify that when running in the browser:
 * - Services use the API routes instead of direct Supabase calls
 * - The fetch helper properly handles success/error cases
 * 
 * This prevents regression of the production auth timeout bug.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { __setForceApiRouteForTests } from '@/lib/services/fetchHelpers';
import { getAllVenues, getVenueById } from '@/lib/services/venueService';
import { getReviewsByVenueId } from '@/lib/services/reviewService';

// Mock Supabase client to ensure we're NOT using it in browser path
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => {
      throw new Error('Supabase client should not be called in browser path');
    }),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Service Browser Path (API Routes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Force API route path for these tests
    __setForceApiRouteForTests(true);
  });

  afterEach(() => {
    // Reset to default behavior
    __setForceApiRouteForTests(null);
  });

  describe('getAllVenues - browser path', () => {
    it('fetches from /api/venues in browser', async () => {
      const mockVenues = [
        { id: 'v1', name: 'Venue 1', city: 'City 1', avgScore: 8, reviewCount: 2 },
        { id: 'v2', name: 'Venue 2', city: 'City 2', avgScore: null, reviewCount: 0 },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockVenues }),
      });

      const result = await getAllVenues();

      expect(mockFetch).toHaveBeenCalledWith('/api/venues', { method: 'GET' });
      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockVenues);
    });

    it('handles API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: 'Database unavailable' }),
      });

      const result = await getAllVenues();

      expect(result.data).toEqual([]);
      expect(result.error).toEqual({ message: 'Database unavailable' });
    });

    it('handles network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await getAllVenues();

      expect(result.data).toEqual([]);
      expect(result.error).toEqual({ message: 'Failed to load venues' });
    });
  });

  describe('getVenueById - browser path', () => {
    it('fetches from /api/venues/[id] in browser', async () => {
      const mockVenue = {
        id: 'venue-123',
        name: 'Test Venue',
        city: 'Test City',
        country: 'USA',
        address: '123 Main St',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockVenue }),
      });

      const result = await getVenueById('venue-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/venues/venue-123', { method: 'GET' });
      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockVenue);
    });

    it('handles venue not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Venue not found' }),
      });

      const result = await getVenueById('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Venue not found' });
    });

    it('handles network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await getVenueById('venue-123');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Failed to load venue' });
    });
  });

  describe('getReviewsByVenueId - browser path', () => {
    it('fetches from /api/reviews/by-venue/[venueId] in browser', async () => {
      const mockReviews = [
        { id: 'r1', reviewer: 'User 1', score: 8, user_id: 'u1' },
        { id: 'r2', reviewer: 'User 2', score: 9, user_id: 'u2' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockReviews }),
      });

      const result = await getReviewsByVenueId('venue-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/reviews/by-venue/venue-123', {
        method: 'GET',
        headers: { 'cache-control': 'no-cache' },
      });
      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockReviews);
    });

    it('returns empty array when no reviews', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await getReviewsByVenueId('venue-123');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('handles API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: 'Database unavailable' }),
      });

      const result = await getReviewsByVenueId('venue-123');

      expect(result.data).toEqual([]);
      expect(result.error).toEqual({ message: 'Database unavailable' });
    });
  });
});

describe('fetchHelpers - shouldUseApiRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    __setForceApiRouteForTests(null);
  });

  it('force flag overrides environment detection', async () => {
    // When forced to true, should use API route
    __setForceApiRouteForTests(true);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await getAllVenues();
    expect(mockFetch).toHaveBeenCalledWith('/api/venues', { method: 'GET' });
  });

  it('force flag set to false triggers Supabase path (which throws in this test)', async () => {
    // When forced to false, should use Supabase (which is mocked to throw)
    __setForceApiRouteForTests(false);
    
    // The mock throws, so we expect the function to catch and return error
    const result = await getAllVenues();
    
    // Since Supabase mock throws, we should get an error
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toBe('Failed to load venues');
  });
});

