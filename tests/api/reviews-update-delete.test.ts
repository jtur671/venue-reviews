/**
 * Tests for PUT/DELETE /api/reviews/[id] - Update and Delete review APIs
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

describe('PUT /api/reviews/[id]', () => {
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

  const validUpdateInput = {
    user_id: 'user-456',
    reviewer_name: 'Updated Name',
    comment: 'Updated comment',
    score: 9,
    sound_score: 8,
    vibe_score: 9,
    staff_score: 8,
    layout_score: 7,
    reviewer_role: 'fan',
  };

  it('successfully updates a review and returns 200', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const mockUpdatedReview = {
      id: 'review-123',
      reviewer_name: 'Updated Name',
      comment: 'Updated comment',
      score: 9,
      sound_score: 8,
      vibe_score: 9,
      staff_score: 8,
      layout_score: 7,
      reviewer_role: 'fan',
      user_id: 'user-456',
      created_at: '2024-01-01T00:00:00Z',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [mockUpdatedReview],
    });

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: JSON.stringify(validUpdateInput),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe('review-123');
    expect(data.data.reviewer).toBe('Updated Name');
    expect(data.data.score).toBe(9);
    expect(data.data.reviewer_role).toBe('fan');
  });

  it('returns 404 when review not found or not authorized', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [], // No results = not found or not authorized
    });

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: JSON.stringify(validUpdateInput),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found or not authorized');
  });

  it('returns 400 for missing user_id', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: JSON.stringify({ ...validUpdateInput, user_id: undefined }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('user_id is required');
  });

  it('returns 400 for invalid score', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: JSON.stringify({ ...validUpdateInput, score: 0 }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('score must be');
  });

  it('returns 400 for invalid aspect score', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: JSON.stringify({ ...validUpdateInput, vibe_score: -1 }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('vibe_score must be');
  });

  it('returns 400 for invalid reviewer_role', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: JSON.stringify({ ...validUpdateInput, reviewer_role: 'invalid' }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('reviewer_role must be');
  });

  it('returns 400 for invalid JSON body', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: 'not json',
    });
    
    const response = await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON body');
  });

  it('returns 500 when Supabase is not configured', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue('Missing configuration');

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: JSON.stringify(validUpdateInput),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });
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

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: JSON.stringify(validUpdateInput),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Failed to update review');
  });

  it('includes user_id in filter for authorization', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'review-123', score: 9 }],
    });

    const { PUT } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123', {
      method: 'PUT',
      body: JSON.stringify(validUpdateInput),
    });
    
    await PUT(request, { params: Promise.resolve({ id: 'review-123' }) });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('id=eq.review-123');
    expect(calledUrl).toContain('user_id=eq.user-456');
  });
});

describe('DELETE /api/reviews/[id]', () => {
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

  it('successfully deletes a review and returns 200', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'review-123' }], // Returns deleted row
    });

    const { DELETE } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123?user_id=user-456');
    
    const response = await DELETE(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when review not found or not authorized', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [], // No rows deleted = not found
    });

    const { DELETE } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123?user_id=user-456');
    
    const response = await DELETE(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found or not authorized');
  });

  it('returns 400 for missing user_id query param', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    const { DELETE } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123');
    
    const response = await DELETE(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('user_id query parameter is required');
  });

  it('returns 500 when Supabase is not configured', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue('Missing configuration');

    const { DELETE } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123?user_id=user-456');
    
    const response = await DELETE(request, { params: Promise.resolve({ id: 'review-123' }) });
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

    const { DELETE } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123?user_id=user-456');
    
    const response = await DELETE(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Failed to delete review');
  });

  it('includes user_id in filter for authorization', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'review-123' }],
    });

    const { DELETE } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123?user_id=user-456');
    
    await DELETE(request, { params: Promise.resolve({ id: 'review-123' }) });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('id=eq.review-123');
    expect(calledUrl).toContain('user_id=eq.user-456');
  });

  it('returns 502 on network error', async () => {
    const { getSupabaseConfigError } = await import('@/lib/supabaseClient');
    (getSupabaseConfigError as any).mockReturnValue(null);

    mockFetch.mockRejectedValue(new Error('Network error'));

    const { DELETE } = await import('../../app/api/reviews/[id]/route');
    
    const request = new NextRequest('http://localhost/api/reviews/review-123?user_id=user-456');
    
    const response = await DELETE(request, { params: Promise.resolve({ id: 'review-123' }) });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Failed to delete review');
  });
});

