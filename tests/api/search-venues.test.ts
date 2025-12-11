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
        photos: [
          {
            photo_reference: 'photo_ref_123',
          },
        ],
      },
    ];

    mockGooglePlacesResponse(mockResults);

    const req = createMockRequest('Bowery Ballroom');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toMatchObject({
      id: 'ChIJ123',
      name: 'Bowery Ballroom',
      city: 'New York',
      country: 'USA',
      address: '6 Delancey St, New York, NY 10002, USA',
      googlePlaceId: 'ChIJ123',
    });
    expect(data.results[0].photoUrl).toContain('photo_reference=photo_ref_123');
    expect(data.results[0].photoUrl).toContain('maxwidth=1200');
    expect(data.results[0].photoUrl).toContain('key=test-api-key');

    // Verify fetch was called with correct query
    // "Bowery Ballroom" contains "ballroom" so it's treated as venue name, not city
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('query=Bowery+Ballroom');
  });

  it('searches with single word query (adds "live music venue")', async () => {
    mockGooglePlacesResponse([]);

    const req = createMockRequest('Miami');
    await GET(req);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('query=Miami+live+music+venue');
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
        name: 'Test Another Venue',
        formatted_address: '456 Oak Ave, Austin, TX, USA',
        types: ['establishment'],
      },
      {
        place_id: 'ChIJ789',
        name: 'Test Simple Venue',
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
      name: 'Test Another Venue',
      city: 'Austin',
      country: 'USA',
    });

    // For single part address, it becomes the country
    expect(data.results[2]).toMatchObject({
      name: 'Test Simple Venue',
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
      googlePlaceId: 'ChIJ123',
      photoUrl: null,
    });
  });

  it('includes photoUrl when place has photos', async () => {
    const mockResults = [
      {
        place_id: 'ChIJ456',
        name: 'Venue With Photo',
        formatted_address: '123 Main St, Miami, FL 33101, USA',
        types: ['establishment'],
        photos: [
          {
            photo_reference: 'photo_ref_abc',
          },
        ],
      },
    ];

    mockGooglePlacesResponse(mockResults);

    const req = createMockRequest('Venue With Photo');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].photoUrl).toBeTruthy();
    expect(data.results[0].photoUrl).toContain('photo_reference=photo_ref_abc');
    expect(data.results[0].photoUrl).toContain('maxwidth=1200');
  });

  it('returns null photoUrl when place has no photos', async () => {
    const mockResults = [
      {
        place_id: 'ChIJ789',
        name: 'Venue Without Photo',
        formatted_address: '456 Oak St, Austin, TX 78701, USA',
        types: ['establishment'],
      },
    ];

    mockGooglePlacesResponse(mockResults);

    const req = createMockRequest('Venue Without Photo');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].photoUrl).toBeNull();
  });

  it('returns null photoUrl when photo_reference is missing', async () => {
    const mockResults = [
      {
        place_id: 'ChIJ000',
        name: 'Venue With Empty Photos',
        formatted_address: '789 Pine St, Seattle, WA 98101, USA',
        types: ['establishment'],
        photos: [{}],
      },
    ];

    mockGooglePlacesResponse(mockResults);

    const req = createMockRequest('Venue With Empty Photos');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].photoUrl).toBeNull();
  });

  it('trims whitespace from query parameters', async () => {
    mockGooglePlacesResponse([]);

    const req = createMockRequest('  Bowery Ballroom  ', '  New York  ');
    await GET(req);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('Bowery+Ballroom');
    expect(fetchUrl).toContain('New+York');
  });

  describe('post-filtering results to match search query', () => {
    it('filters out results that do not contain all search terms', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'St. Pete Music Hall',
          formatted_address: '123 Main St, St. Petersburg, FL 33701, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Key West Venue',
          formatted_address: '456 Duval St, Key West, FL 33040, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ789',
          name: 'Ybor City Club',
          formatted_address: '789 7th Ave, Tampa, FL 33605, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('key');
      const response = await GET(req);
      const data = await response.json();

      // Should only return venues that contain "key" in name, city, or address
      expect(data.results).toHaveLength(1);
      expect(data.results[0].name).toBe('Key West Venue');
      expect(data.results[0].city).toBe('Key West');
    });

    it('requires all words in multi-word search to match', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'Key Largo Music',
          formatted_address: '123 Main St, Key Largo, FL 33037, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Key West Venue',
          formatted_address: '456 Duval St, Key West, FL 33040, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ789',
          name: 'West End Club',
          formatted_address: '789 Main St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('key west');
      const response = await GET(req);
      const data = await response.json();

      // Should only return venues that contain both "key" and "west"
      expect(data.results).toHaveLength(1);
      expect(data.results[0].name).toBe('Key West Venue');
      expect(data.results[0].city).toBe('Key West');
    });

    it('matches search terms in venue name', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'The Key Club',
          formatted_address: '123 Main St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Music Hall',
          formatted_address: '456 Oak St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('key');
      const response = await GET(req);
      const data = await response.json();

      expect(data.results).toHaveLength(1);
      expect(data.results[0].name).toBe('The Key Club');
    });

    it('matches search terms in city name', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'Music Venue',
          formatted_address: '123 Main St, Key West, FL 33040, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Another Venue',
          formatted_address: '456 Oak St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('key');
      const response = await GET(req);
      const data = await response.json();

      expect(data.results).toHaveLength(1);
      expect(data.results[0].city).toBe('Key West');
    });

    it('matches search terms in address', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'Music Venue',
          formatted_address: '123 Key Street, Miami, FL 33101, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Another Venue',
          formatted_address: '456 Oak St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('key');
      const response = await GET(req);
      const data = await response.json();

      expect(data.results).toHaveLength(1);
      expect(data.results[0].address).toContain('Key Street');
    });

    it('does not filter when no query is provided (city only)', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'Venue 1',
          formatted_address: '123 Main St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Venue 2',
          formatted_address: '456 Oak St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest(undefined, 'Miami');
      const response = await GET(req);
      const data = await response.json();

      // Should return all results when only city filter is used
      expect(data.results).toHaveLength(2);
    });

    it('case-insensitive matching', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'KEY WEST VENUE',
          formatted_address: '123 Main St, KEY WEST, FL 33040, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Key West Venue',
          formatted_address: '456 Duval St, Key West, FL 33040, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('key west');
      const response = await GET(req);
      const data = await response.json();

      expect(data.results).toHaveLength(2);
    });

    it('handles partial word matches correctly', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'Keyboard Club',
          formatted_address: '123 Main St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Music Hall',
          formatted_address: '456 Oak St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('key');
      const response = await GET(req);
      const data = await response.json();

      // "key" should match "Keyboard" (partial match)
      expect(data.results).toHaveLength(1);
      expect(data.results[0].name).toBe('Keyboard Club');
    });

    it('searches for venues in multi-word cities like Key West', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'Sunset Pier',
          formatted_address: '0 Duval St, Key West, FL 33040, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'The Backyard Bar',
          formatted_address: 'Key West, FL 33040, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ789',
          name: 'Venue in Miami',
          formatted_address: '123 Main St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('key west');
      const response = await GET(req);
      const data = await response.json();

      // Should return venues in Key West
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results.every((r: { city: string }) => r.city.toLowerCase().includes('key west'))).toBe(true);
      
      // Verify the query sent to Google includes "live music venues in"
      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain('live+music+venues+in+key+west');
    });

    it('searches for venues in New Orleans', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'Preservation Hall',
          formatted_address: '726 St Peter St, New Orleans, LA 70116, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Tipitinas',
          formatted_address: '501 Napoleon Ave, New Orleans, LA 70115, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ789',
          name: 'Venue in Baton Rouge',
          formatted_address: '123 Main St, Baton Rouge, LA 70801, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('new orleans');
      const response = await GET(req);
      const data = await response.json();

      // Should return venues in New Orleans
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results.every((r: { city: string }) => r.city.toLowerCase().includes('new orleans'))).toBe(true);
      
      // Verify the query sent to Google includes "live music venues in"
      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain('live+music+venues+in+new+orleans');
    });

    it('still filters venue name searches correctly', async () => {
      const mockResults = [
        {
          place_id: 'ChIJ123',
          name: 'The Key Club',
          formatted_address: '123 Main St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
        {
          place_id: 'ChIJ456',
          name: 'Music Hall',
          formatted_address: '456 Oak St, Miami, FL 33101, USA',
          types: ['establishment'],
        },
      ];

      mockGooglePlacesResponse(mockResults);

      const req = createMockRequest('key club');
      const response = await GET(req);
      const data = await response.json();

      // Should match venue name, not treat as city
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results[0].name.toLowerCase()).toContain('key');
    });
  });
});
