import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getAllVenues, getVenueById, createVenue } from '@/lib/services/venueService';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Venue Service', () => {
  const mockFrom = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any) = mockFrom;
  });

  describe('getAllVenues', () => {
    it('returns venues with stats when successful', async () => {
      const mockVenues = [
        {
          id: 'venue-1',
          name: 'Test Venue',
          city: 'Test City',
          reviews: [
            { score: 8, created_at: '2024-01-01T00:00:00Z' },
            { score: 9, created_at: '2024-01-02T00:00:00Z' },
          ],
        },
        {
          id: 'venue-2',
          name: 'Another Venue',
          city: 'Another City',
          reviews: [],
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockVenues,
        error: null,
      });

      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getAllVenues();

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].id).toBe('venue-1');
      expect(result.data?.[0].name).toBe('Test Venue');
      expect(result.data?.[0].avgScore).toBe(8.5); // (8 + 9) / 2
      expect(result.data?.[0].reviewCount).toBe(2);
      expect(result.data?.[1].reviewCount).toBe(0);
      expect(mockFrom).toHaveBeenCalledWith('venues');
      expect(mockSelect).toHaveBeenCalledWith('id, name, city, reviews(score, created_at)');
      expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('returns empty array when no venues exist', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getAllVenues();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('handles errors correctly', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST301', message: 'Database error' },
      });

      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getAllVenues();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('PGRST301');
      expect(result.error?.message).toBe('Failed to load venues');
    });

    it('handles null data gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getAllVenues();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });

  describe('getVenueById', () => {
    it('returns venue when found', async () => {
      const mockVenue = {
        id: 'venue-1',
        name: 'Test Venue',
        city: 'Test City',
        country: 'USA',
        address: '123 Main St',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockVenue,
        error: null,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getVenueById('venue-1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockVenue);
      expect(mockFrom).toHaveBeenCalledWith('venues');
      expect(mockSelect).toHaveBeenCalledWith('id, name, city, country, address');
      expect(mockEq).toHaveBeenCalledWith('id', 'venue-1');
    });

    it('returns error when venue not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getVenueById('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Venue not found');
    });

    it('returns generic error for other errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST301', message: 'Database error' },
      }) });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getVenueById('venue-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Failed to load venue');
    });
  });

  describe('createVenue', () => {
    it('creates venue successfully', async () => {
      const mockVenue = {
        id: 'new-venue-id',
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockVenue,
        error: null,
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await createVenue({
        name: 'New Venue',
        city: 'New City',
        country: 'USA',
        address: '123 Main St',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ id: 'new-venue-id' });
      expect(mockFrom).toHaveBeenCalledWith('venues');
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'New Venue',
        city: 'New City',
        country: 'USA',
        address: '123 Main St',
      });
    });

    it('trims whitespace from input fields', async () => {
      const mockVenue = { id: 'new-venue-id' };
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockVenue,
        error: null,
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockFrom.mockReturnValue({ insert: mockInsert });

      await createVenue({
        name: '  Trimmed Venue  ',
        city: '  Trimmed City  ',
        country: '  USA  ',
        address: '  123 Main St  ',
      });

      expect(mockInsert).toHaveBeenCalledWith({
        name: 'Trimmed Venue',
        city: 'Trimmed City',
        country: 'USA',
        address: '123 Main St',
      });
    });

    it('uses default country when not provided', async () => {
      const mockVenue = { id: 'new-venue-id' };
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockVenue,
        error: null,
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockFrom.mockReturnValue({ insert: mockInsert });

      await createVenue({
        name: 'New Venue',
        city: 'New City',
      });

      expect(mockInsert).toHaveBeenCalledWith({
        name: 'New Venue',
        city: 'New City',
        country: 'USA',
        address: null,
      });
    });

    it('handles null address', async () => {
      const mockVenue = { id: 'new-venue-id' };
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockVenue,
        error: null,
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockFrom.mockReturnValue({ insert: mockInsert });

      await createVenue({
        name: 'New Venue',
        city: 'New City',
        address: null,
      });

      expect(mockInsert).toHaveBeenCalledWith({
        name: 'New Venue',
        city: 'New City',
        country: 'USA',
        address: null,
      });
    });

    it('handles creation errors', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate key' },
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await createVenue({
        name: 'New Venue',
        city: 'New City',
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('23505');
      expect(result.error?.message).toBe('Failed to create venue');
    });
  });
});
