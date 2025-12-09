import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/search-venues/route';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Search Venues API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required env var
    process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = (query?: string, city?: string): NextRequest => {
    const url = new URL('http://localhost:3000/api/search-venues');
    if (query) url.searchParams.set('q', query);
    if (city) url.searchParams.set('city', city);
    return new NextRequest(url);
  };

  const mockGooglePlacesResponse = (results: any[], status: string = 'OK') => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          status,
          results,
        }),
    } as Response);
  };

  it('returns empty results when no query or city provided', async () => {
    const req = createMockRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ results: [] });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('searches with venue name query', async () => {
    const mockResults = [
      {
        place_id: 'ChIJ123',
        name: 'Bowery Ballroom',
        formatted_address: '6 Delancey St, New York, NY 10002, USA',
        types: ['establishment', 'point_of_interest'],
      },
    ];

    mockGooglePlacesResponse(mockResults);

    const req = createMockRequest('Bowery Ballroom');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toEqual({
      id: 'ChIJ123',
      name: 'Bowery Ballroom',
      city: 'New York',
      country: 'USA',
      address: '6 Delancey St, New York, NY 10002, USA',
    });

    // Verify fetch was called with correct query
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('query=Bowery');
    expect(fetchUrl).toContain('Ballroom');
  });

  it('searches with single word query (adds "live music venues")', async () => {
    mockGooglePlacesResponse([]);

    const req = createMockRequest('Miami');
    await GET(req);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('query=live+music+venues+in+Miami');
  });

  it('searches with venue name and city', async () => {
    const mockResults = [
      {
        place_id: 'ChIJ456',
        name: 'Factory Town',
        formatted_address: '123 Main St, Miami, FL 33101, USA',
        types: ['establishment'],
      },
    ];

    mockGooglePlacesResponse(mockResults);

    const req = createMockRequest('Factory Town', 'Miami');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].name).toBe('Factory Town');
    expect(data.results[0].city).toBe('Miami');

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('Factory+Town');
    expect(fetchUrl).toContain('Miami');
  });

  it('searches with city only', async () => {
    mockGooglePlacesResponse([]);

    const req = createMockRequest(undefined, 'Austin');
    await GET(req);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('query=live+music+venues+in+Austin');
  });

  it('filters out unwanted place types', async () => {
    const mockResults = [
      {
        place_id: 'ChIJ123',
        name: 'New York',
        formatted_address: 'New York, NY, USA',
        types: ['locality', 'political'],
      },
      {
        place_id: 'ChIJ456',
        name: 'Bowery Ballroom',
        formatted_address: '6 Delancey St, New York, NY 10002, USA',
        types: ['establishment', 'point_of_interest'],
      },
    ];

    mockGooglePlacesResponse(mockResults);

    const req = createMockRequest('New York');
    const response = await GET(req);
    const data = await response.json();

    expect(data.results).toHaveLength(1);
    expect(data.results[0].name).toBe('Bowery Ballroom');
  });

  it('parses address components correctly', async () => {
    const mockResults = [
      {
        place_id: 'ChIJ123',
        name: 'Test Venue',
        formatted_address: '123 Main St, Miami, FL 33101, USA',
        types: ['establishment'],
      },
      {
        place_id: 'ChIJ456',
        name: 'Another Venue',
        formatted_address: '456 Oak Ave, Austin, TX, USA',
        types: ['establishment'],
      },
      {
        place_id: 'ChIJ789',
        name: 'Simple Venue',
        formatted_address: '789 Pine St, USA',
        types: ['establishment'],
      },
    ];

    mockGooglePlacesResponse(mockResults);

    const req = createMockRequest('test');
    const response = await GET(req);
    const data = await response.json();

    expect(data.results[0]).toMatchObject({
      name: 'Test Venue',
      city: 'Miami',
      country: 'USA',
    });

    expect(data.results[1]).toMatchObject({
      name: 'Another Venue',
      city: 'Austin',
      country: 'USA',
    });

    // For single part address, it becomes the country
    expect(data.results[2]).toMatchObject({
      name: 'Simple Venue',
      country: 'USA',
    });
  });

  it('handles ZERO_RESULTS status', async () => {
    mockGooglePlacesResponse([], 'ZERO_RESULTS');

    const req = createMockRequest('Nonexistent Venue');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual([]);
  });

  it('handles Google Places API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          status: 'REQUEST_DENIED',
          error_message: 'API key invalid',
        }),
    } as Response);

    const req = createMockRequest('test');
    const response = await GET(req);

    expect(response.status).toBe(502);
  });

  it('handles HTTP errors from Google Places', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response);

    const req = createMockRequest('test');
    const response = await GET(req);

    expect(response.status).toBe(502);
  });

  it('handles fetch failures', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const req = createMockRequest('test');
    const response = await GET(req);

    expect(response.status).toBe(500);
  });

  it('returns 500 when GOOGLE_PLACES_API_KEY is missing', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;

    const req = createMockRequest('test');
    const response = await GET(req);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe('Missing GOOGLE_PLACES_API_KEY');
  });

  it('handles empty formatted_address gracefully', async () => {
    const mockResults = [
      {
        place_id: 'ChIJ123',
        name: 'Test Venue',
        formatted_address: '',
        types: ['establishment'],
      },
    ];

    mockGooglePlacesResponse(mockResults);

    const req = createMockRequest('test');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0]).toMatchObject({
      name: 'Test Venue',
      city: '',
      country: '',
      address: '',
    });
  });

  it('trims whitespace from query parameters', async () => {
    mockGooglePlacesResponse([]);

    const req = createMockRequest('  Bowery Ballroom  ', '  New York  ');
    await GET(req);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('Bowery+Ballroom');
    expect(fetchUrl).toContain('New+York');
  });
});
