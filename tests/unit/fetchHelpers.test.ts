/**
 * Tests for fetchHelpers - specifically duplicate error handling with data
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchFromApi } from '@/lib/services/fetchHelpers';

describe('fetchFromApi Duplicate Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data when duplicate error (409) includes existing review', async () => {
    const existingReview = {
      id: 'existing-review-123',
      user_id: 'user-123',
      score: 9,
      reviewer_name: 'Existing Reviewer',
      comment: 'Existing comment',
      created_at: '2024-01-01T00:00:00Z',
      sound_score: 8,
      vibe_score: 9,
      staff_score: 9,
      layout_score: 9,
      reviewer_role: 'fan',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: "You've already left a report card for this venue from this browser.",
        code: '23505',
        isDuplicate: true,
        data: existingReview,
      }),
    });

    const result = await fetchFromApi('/api/reviews', {
      method: 'POST',
      body: { venue_id: 'venue-123', user_id: 'user-123' },
    });

    // Should return the existing review data even though status is 409
    expect(result.data).toEqual(existingReview);
    expect(result.error).toBeDefined();
    expect(result.error?.isDuplicate).toBe(true);
    expect(result.error?.code).toBe('23505');
  });

  it('returns error when duplicate error (409) has no data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: "You've already left a report card for this venue from this browser.",
        code: '23505',
        isDuplicate: true,
      }),
    });

    const result = await fetchFromApi('/api/reviews', {
      method: 'POST',
      body: { venue_id: 'venue-123', user_id: 'user-123' },
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error?.isDuplicate).toBe(true);
    expect(result.error?.code).toBe('23505');
  });

  it('returns error for non-duplicate 409 errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Some other conflict',
        code: '409',
      }),
    });

    const result = await fetchFromApi('/api/reviews', {
      method: 'POST',
      body: { venue_id: 'venue-123', user_id: 'user-123' },
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('Some other conflict');
  });

  it('validates POST/PUT requests require data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        // Missing data field
      }),
    });

    const result = await fetchFromApi('/api/reviews', {
      method: 'POST',
      body: { venue_id: 'venue-123', user_id: 'user-123' },
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('missing data');
  });

  it('handles JSON parsing errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const result = await fetchFromApi('/api/reviews', {
      method: 'GET',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Invalid response');
  });

  it('handles network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await fetchFromApi('/api/reviews', {
      method: 'GET',
      errorMessage: 'Custom error message',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('Custom error message');
  });
});

