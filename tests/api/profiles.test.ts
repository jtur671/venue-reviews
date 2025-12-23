/**
 * Tests for POST /api/profiles - Profile creation/upsert API
 * 
 * This API handles profile persistence with graceful degradation:
 * - Tries to save to Supabase via REST API
 * - Returns 200 with persisted:false if RLS blocks the insert (expected for anonymous users)
 * - Client falls back to localStorage
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

describe('POST /api/profiles', () => {
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

  it('successfully creates profile and returns persisted:true', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    // Mock successful upsert
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => [{ id: 'user-123', role: 'artist' }],
      })
      // Mock successful fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'user-123', role: 'artist' }],
      });

    const { POST } = await import('../../app/api/profiles/route');
    
    const request = new NextRequest('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123', role: 'artist' }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.role).toBe('artist');
    expect(data.data.persisted).toBe(true);
  });

  it('returns persisted:false when RLS blocks insert (403)', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    // Mock RLS rejection
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Row level security violation',
    });

    const { POST } = await import('../../app/api/profiles/route');
    
    const request = new NextRequest('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123', role: 'fan' }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200); // Not 502!
    expect(data.data.role).toBe('fan');
    expect(data.data.persisted).toBe(false);
  });

  it('returns persisted:false on network error', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { POST } = await import('../../app/api/profiles/route');
    
    const request = new NextRequest('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123', role: 'artist' }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200); // Graceful degradation
    expect(data.data.role).toBe('artist');
    expect(data.data.persisted).toBe(false);
  });

  it('handles 409 Conflict (profile already exists)', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    // Mock 409 Conflict on upsert
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () => 'Conflict',
      })
      // Mock successful fetch to get existing profile
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'user-123', role: 'fan' }], // Already set to fan
      });

    const { POST } = await import('../../app/api/profiles/route');
    
    const request = new NextRequest('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123', role: 'artist' }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.role).toBe('fan'); // Returns existing role
    expect(data.data.persisted).toBe(true);
  });

  it('returns 400 for missing userId', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { POST } = await import('../../app/api/profiles/route');
    
    const request = new NextRequest('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ role: 'artist' }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('returns 400 for invalid role', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { POST } = await import('../../app/api/profiles/route');
    
    const request = new NextRequest('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123', role: 'admin' }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('role must be "artist" or "fan"');
  });

  it('returns 500 when Supabase is not configured', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue('Missing configuration');

    const { POST } = await import('../../app/api/profiles/route');
    
    const request = new NextRequest('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123', role: 'artist' }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Missing configuration');
  });

  it('returns 400 for invalid JSON body', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { POST } = await import('../../app/api/profiles/route');
    
    const request = new NextRequest('http://localhost/api/profiles', {
      method: 'POST',
      body: 'not json',
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON body');
  });
});

