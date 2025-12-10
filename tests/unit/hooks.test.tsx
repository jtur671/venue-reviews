import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnonUser } from '@/hooks/useAnonUser';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInAnonymously: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
  },
}));

describe('Custom Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useAnonUser', () => {
    it('returns loading state initially', () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });
      (supabase.auth.signInAnonymously as any).mockResolvedValue({
        data: { user: { id: 'anon-123' } },
        error: null,
      });

      const { result } = renderHook(() => useAnonUser());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it('returns existing user when already authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'existing-user-123' } },
      });

      const { result } = renderHook(() => useAnonUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual({ id: 'existing-user-123' });
      expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
    });

    it('creates anonymous user when not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });
      (supabase.auth.signInAnonymously as any).mockResolvedValue({
        data: { user: { id: 'new-anon-123' } },
        error: null,
      });

      const { result } = renderHook(() => useAnonUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual({ id: 'new-anon-123' });
      expect(supabase.auth.signInAnonymously).toHaveBeenCalled();
    });

    it('handles anonymous sign-in errors', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });
      (supabase.auth.signInAnonymously as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Rate limit exceeded' },
      });

      const { result } = renderHook(() => useAnonUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('useCurrentUser', () => {
    it('returns loading state initially', () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

      const { result } = renderHook(() => useCurrentUser());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it('returns user when authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      });

      const { result } = renderHook(() => useCurrentUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });

    it('returns null when not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

      const { result } = renderHook(() => useCurrentUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('handles user without email', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: null,
          },
        },
      });

      const { result } = renderHook(() => useCurrentUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: 'user-123',
        email: undefined,
      });
    });

    it('sets up auth state change listener', () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

      renderHook(() => useCurrentUser());

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('useProfile', () => {
    const createMockChain = () => {
      const mockMaybeSingle = vi.fn();
      const mockSingle = vi.fn();
      const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
      
      return {
        mockSelect,
        mockEq,
        mockMaybeSingle,
        mockInsert,
        mockSingle,
        mockFrom: vi.fn(() => ({
          select: mockSelect,
          insert: mockInsert,
        })),
      };
    };

    it('returns null profile when user is null', () => {
      const { result } = renderHook(() => useProfile(null));

      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('loads existing profile', async () => {
      const mocks = createMockChain();
      (supabase.from as any) = mocks.mockFrom;

      const mockProfile = {
        id: 'user-123',
        display_name: 'Test User',
        role: 'artist' as const,
      };

      mocks.mockMaybeSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const { result } = renderHook(() =>
        useProfile({ id: 'user-123', email: 'test@example.com' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(mocks.mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('creates profile when it does not exist', async () => {
      const mocks = createMockChain();
      (supabase.from as any) = mocks.mockFrom;

      mocks.mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      mocks.mockSingle.mockResolvedValue({
        data: {
          id: 'user-123',
          display_name: null,
          role: null,
        },
        error: null,
      });

      const { result } = renderHook(() =>
        useProfile({ id: 'user-123', email: 'test@example.com' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual({
        id: 'user-123',
        display_name: null,
        role: null,
      });
    });

    it('handles profile creation errors', async () => {
      const mocks = createMockChain();
      (supabase.from as any) = mocks.mockFrom;

      mocks.mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      mocks.mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const { result } = renderHook(() =>
        useProfile({ id: 'user-123', email: 'test@example.com' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
    });

    it('updates profile when user changes', async () => {
      const mocks1 = createMockChain();
      const mocks2 = createMockChain();
      
      const mockProfile1 = {
        id: 'user-123',
        display_name: 'User 1',
        role: 'artist' as const,
      };

      const mockProfile2 = {
        id: 'user-456',
        display_name: 'User 2',
        role: 'fan' as const,
      };

      mocks1.mockMaybeSingle.mockResolvedValue({
        data: mockProfile1,
        error: null,
      });

      mocks2.mockMaybeSingle.mockResolvedValue({
        data: mockProfile2,
        error: null,
      });

      (supabase.from as any) = vi.fn()
        .mockReturnValueOnce(mocks1.mockFrom())
        .mockReturnValueOnce(mocks2.mockFrom());

      const { result, rerender } = renderHook(
        ({ user }) => useProfile(user),
        {
          initialProps: { user: { id: 'user-123', email: 'user1@example.com' } },
        }
      );

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile1);
      });

      rerender({ user: { id: 'user-456', email: 'user2@example.com' } });

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile2);
      });
    });
  });
});
