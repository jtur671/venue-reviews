import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the supabaseClient module before importing the route
vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseConfigError: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GET /api/reviews/by-venue/[venueId]', () => {
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

  it('returns reviews mapped with correct field names', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const mockReviews = [
      {
        id: 'review-1',
        reviewer_name: 'Test User',
        score: 8,
        comment: 'Great venue',
        created_at: '2024-01-01T00:00:00Z',
        sound_score: 8,
        vibe_score: 9,
        staff_score: 7,
        layout_score: 8,
        user_id: 'user-1',
        reviewer_role: 'artist',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockReviews,
    });

    const { GET } = await import('../../app/api/reviews/by-venue/[venueId]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/venue-123');
    const response = await GET(request, { params: Promise.resolve({ venueId: 'venue-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    // Verify reviewer_name is mapped to reviewer
    expect(data.data[0].reviewer).toBe('Test User');
    expect(data.data[0].reviewer_name).toBeUndefined();
    expect(data.data[0].score).toBe(8);
    expect(data.data[0].reviewer_role).toBe('artist');
  });

  it('returns empty array when no reviews exist', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { GET } = await import('../../app/api/reviews/by-venue/[venueId]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/venue-123');
    const response = await GET(request, { params: Promise.resolve({ venueId: 'venue-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
  });

  it('returns 500 when Supabase is not configured', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue('Missing configuration');

    const { GET } = await import('../../app/api/reviews/by-venue/[venueId]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/venue-123');
    const response = await GET(request, { params: Promise.resolve({ venueId: 'venue-123' }) });
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
    });

    const { GET } = await import('../../app/api/reviews/by-venue/[venueId]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/venue-123');
    const response = await GET(request, { params: Promise.resolve({ venueId: 'venue-123' }) });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Failed to load reviews');
  });

  it('constructs correct Supabase REST URL with filters', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { GET } = await import('../../app/api/reviews/by-venue/[venueId]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/venue-123');
    await GET(request, { params: Promise.resolve({ venueId: 'venue-123' }) });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('venue_id=eq.venue-123');
    expect(calledUrl).toContain('order=created_at.desc');
  });
});

