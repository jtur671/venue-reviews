/**
 * Tests for POST /api/reviews - Create review API
 * 
 * This API bypasses client-side Supabase auth issues by using REST API directly
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the supabaseClient module
vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseConfigError: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('POST /api/reviews', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validReviewInput = {
    venue_id: 'venue-123',
    user_id: 'user-456',
    reviewer_name: 'Test User',
    comment: 'Great venue!',
    score: 8,
    sound_score: 7,
    vibe_score: 8,
    staff_score: 9,
    layout_score: 7,
    reviewer_role: 'artist',
  };

  it('successfully creates a review and returns 201', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const mockCreatedReview = {
      id: 'review-789',
      ...validReviewInput,
      reviewer_name: 'Test User',
      created_at: '2024-01-01T00:00:00Z',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => [mockCreatedReview],
    });

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify(validReviewInput),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.id).toBe('review-789');
    expect(data.data.reviewer).toBe('Test User'); // mapped from reviewer_name
    expect(data.data.score).toBe(8);
    expect(data.data.reviewer_role).toBe('artist');
  });

  it('returns 409 for duplicate review (user already reviewed venue)', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => 'UNIQUE violation 23505 duplicate key',
    });

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify(validReviewInput),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.isDuplicate).toBe(true);
    expect(data.code).toBe('23505');
    expect(data.error).toContain('already left a report card');
  });

  it('returns 400 for missing venue_id', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...validReviewInput, venue_id: undefined }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('venue_id is required');
  });

  it('returns 400 for missing user_id', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...validReviewInput, user_id: undefined }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('user_id is required');
  });

  it('returns 400 for invalid score (out of range)', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...validReviewInput, score: 15 }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('score must be');
  });

  it('returns 400 for invalid aspect score', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...validReviewInput, sound_score: 11 }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('sound_score must be');
  });

  it('returns 400 for invalid reviewer_role', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...validReviewInput, reviewer_role: 'admin' }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('reviewer_role must be');
  });

  it('returns 400 for invalid JSON body', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: 'not json',
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON body');
  });

  it('returns 500 when Supabase is not configured', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue('Missing configuration');

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify(validReviewInput),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Missing configuration');
  });

  it('returns 502 when Supabase REST API fails', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    });

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify(validReviewInput),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Failed to create review');
  });

  it('returns 502 on network error', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockRejectedValue(new Error('Network error'));

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify(validReviewInput),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Failed to create review');
  });

  it('trims reviewer_name and comment whitespace', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => [{
        id: 'review-789',
        reviewer_name: 'Trimmed Name',
        comment: 'Trimmed comment',
        score: 8,
        created_at: '2024-01-01T00:00:00Z',
      }],
    });

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        ...validReviewInput,
        reviewer_name: '  Trimmed Name  ',
        comment: '  Trimmed comment  ',
      }),
    });
    
    await POST(request);

    // Check that the fetch was called with trimmed values
    // Note: first call is for profile, second is for review
    const reviewCall = mockFetch.mock.calls.find(call => call[0].includes('/reviews'));
    const fetchBody = JSON.parse(reviewCall[1].body);
    expect(fetchBody.reviewer_name).toBe('Trimmed Name');
    expect(fetchBody.comment).toBe('Trimmed comment');
  });

  it('allows null reviewer_role (for anonymous users)', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => [{
        id: 'review-789',
        score: 8,
        reviewer_role: null,
        created_at: '2024-01-01T00:00:00Z',
      }],
    });

    const { POST } = await import('../../app/api/reviews/route');
    
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...validReviewInput, reviewer_role: null }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.reviewer_role).toBe(null);
  });
});

