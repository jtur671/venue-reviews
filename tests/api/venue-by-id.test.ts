import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the supabaseClient module before importing the route
vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseConfigError: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GET /api/venues/[id]', () => {
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

  it('returns venue data when found', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const mockVenue = {
      id: 'venue-123',
      name: 'Test Venue',
      city: 'Test City',
      country: 'USA',
      address: '123 Main St',
      photo_url: null,
      google_place_id: null,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [mockVenue],
    });

    // Import the route handler using relative path
    const { GET } = await import('../../app/api/venues/[id]/route');
    
    const request = new NextRequest('http://localhost/api/venues/venue-123');
    const response = await GET(request, { params: Promise.resolve({ id: 'venue-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockVenue);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/venues'),
      expect.objectContaining({
        headers: {
          apikey: 'test-anon-key',
          Authorization: 'Bearer test-anon-key',
        },
      })
    );
  });

  it('returns 404 when venue not found', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { GET } = await import('../../app/api/venues/[id]/route');
    
    const request = new NextRequest('http://localhost/api/venues/nonexistent');
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Venue not found');
  });

  it('returns 500 when Supabase is not configured', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue('Missing configuration');

    const { GET } = await import('../../app/api/venues/[id]/route');
    
    const request = new NextRequest('http://localhost/api/venues/venue-123');
    const response = await GET(request, { params: Promise.resolve({ id: 'venue-123' }) });
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

    const { GET } = await import('../../app/api/venues/[id]/route');
    
    const request = new NextRequest('http://localhost/api/venues/venue-123');
    const response = await GET(request, { params: Promise.resolve({ id: 'venue-123' }) });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Failed to load venue');
  });

  it('handles network errors gracefully', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockRejectedValue(new Error('Network error'));

    const { GET } = await import('../../app/api/venues/[id]/route');
    
    const request = new NextRequest('http://localhost/api/venues/venue-123');
    const response = await GET(request, { params: Promise.resolve({ id: 'venue-123' }) });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Failed to load venue');
  });
});

