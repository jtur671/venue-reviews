import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/auth/callback/route';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Auth Callback Route', () => {
  const mockExchangeCodeForSession = vi.fn();
  const mockSupabaseClient = {
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    (createClient as any).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = (code?: string, origin: string = 'http://localhost:3000'): NextRequest => {
    const url = new URL(`${origin}/auth/callback`);
    if (code) {
      url.searchParams.set('code', code);
    }
    return new NextRequest(url);
  };

  it('redirects to /account when code is provided and exchange succeeds', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = createMockRequest('test-code-123');
    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get('location')).toBe('http://localhost:3000/account');
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      {
        auth: {
          persistSession: false,
        },
      }
    );
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code-123');
  });

  it('redirects to /account even when exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Invalid code' },
    });

    const request = createMockRequest('invalid-code');
    const response = await GET(request);

    // Should still redirect to account page (user can sign in again)
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/account');
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('invalid-code');
  });

  it('redirects to /account when no code is provided', async () => {
    const request = createMockRequest(undefined);
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/account');
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('handles different origin URLs correctly', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = createMockRequest('test-code', 'https://example.com');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/account');
  });

  it('creates Supabase client with correct configuration', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = createMockRequest('test-code');
    await GET(request);

    expect(createClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );
  });

  it('handles empty code parameter', async () => {
    const request = createMockRequest('');
    const response = await GET(request);

    // Empty string code should still trigger exchange attempt
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/account');
  });
});
