import { NextRequest, NextResponse } from 'next/server';

type GooglePlace = {
  place_id: string;
  name: string;
  formatted_address?: string;
  types?: string[];
  photos?: Array<{
    height?: number;
    width?: number;
    photo_reference: string;
  }>;
};

function pickBestPhotoReference(
  photos: Array<{ photo_reference: string; width?: number; height?: number }> | undefined
): string | null {
  if (!photos || photos.length === 0) return null;

  // Heuristic:
  // - Prefer landscape images (better for cards)
  // - Prefer higher resolution
  // Google sorts by relevance, but the first photo is often parking lots / map captures.
  const scored = photos
    .filter((p) => typeof p.photo_reference === 'string' && p.photo_reference.length > 0)
    .map((p, idx) => {
      const w = typeof p.width === 'number' ? p.width : 0;
      const h = typeof p.height === 'number' ? p.height : 0;
      const isLandscape = w > 0 && h > 0 ? w >= h : true;
      const area = w > 0 && h > 0 ? w * h : 0;

      // Keep a small bias toward Google's ordering (lower idx wins ties).
      const score =
        (isLandscape ? 1_000_000_000 : 0) +
        area +
        w * 10_000 -
        idx; // tiny tie-breaker

      return { ref: p.photo_reference, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.ref ?? null;
}

function buildPhotoUrl(place: GooglePlace): string | null {
  // Pick the best candidate instead of always using photos[0]
  const ref = pickBestPhotoReference(place.photos);
  if (!ref) return null;

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  // Use maxwidth=1200 for better quality on venue cards
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(
    ref
  )}&key=${key}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const cityParam = (searchParams.get('city') ?? '').trim();

  // Build a smarter text query
  let effectiveQuery = '';
  const searchTerms = q.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  
  // Common venue name keywords - if present, treat as venue search
  const venueKeywords = ['ballroom', 'hall', 'club', 'theater', 'theatre', 'venue', 'bar', 'lounge', 'tavern', 'pub', 'center', 'centre', 'music'];
  const hasVenueKeywords = venueKeywords.some(keyword => q.toLowerCase().includes(keyword));
  
  // Determine if this is likely a city search
  // Multi-word queries without venue keywords are likely city searches
  // Single words are treated as venue name searches to avoid false positives
  const wordCount = searchTerms.length;
  const isLikelyCitySearch = wordCount >= 2 && !hasVenueKeywords;

  if (q && cityParam) {
    // User typed a venue + picked a city
    effectiveQuery = `${q} in ${cityParam}`;
  } else if (q && !cityParam) {
    if (wordCount === 1) {
      // Single word: search as venue name (not city) to avoid irrelevant results
      // This prevents "key" from matching venues in random cities
      effectiveQuery = `${q} live music venue`;
    } else if (isLikelyCitySearch) {
      // Multi-word that looks like a city: search for venues in that city
      effectiveQuery = `live music venues in ${q}`;
    } else {
      // Multi-word with venue keywords: treat as venue name
      effectiveQuery = q;
    }
  } else if (!q && cityParam) {
    effectiveQuery = `live music venues in ${cityParam}`;
  }

  if (!effectiveQuery) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('Missing GOOGLE_PLACES_API_KEY env var');
    return NextResponse.json(
      { error: 'Search service not configured', results: [] },
      { status: 500 }
    );
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', effectiveQuery);
  url.searchParams.set('key', apiKey);

  try {
    const resp = await fetch(url.toString(), {
      cache: 'no-store',
    });

    const text = await resp.text();

    if (!resp.ok) {
      console.error('Google Places HTTP error:', resp.status, text);
      return NextResponse.json(
        { error: 'Upstream error', details: process.env.NODE_ENV === 'development' ? text.slice(0, 200) : undefined },
        { status: 502 }
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      console.error('Failed to parse Google Places response:', parseErr, 'Response text:', text.slice(0, 200));
      return NextResponse.json(
        { error: 'Invalid response from search service', details: process.env.NODE_ENV === 'development' ? 'Failed to parse JSON' : undefined },
        { status: 502 }
      );
    }

    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      console.error('Google Places API status:', json.status, json.error_message);
      return NextResponse.json(
        { error: 'Places API error', details: process.env.NODE_ENV === 'development' ? json.error_message : undefined },
        { status: 502 }
      );
    }

    const rawResults: GooglePlace[] = json.results ?? [];

    const filtered = rawResults.filter((p) => {
      const types = p.types ?? [];
      const unwanted = [
        'locality',
        'administrative_area_level_1',
        'administrative_area_level_2',
        'country',
        'political',
      ];
      return !types.some((t) => unwanted.includes(t));
    });

    const mapped = filtered.map((p) => {
      const address = p.formatted_address ?? '';

      let city = '';
      let country = '';
      const parts = address.split(',').map((s) => s.trim());
      if (parts.length >= 4) {
        // Format: "Street, City, State ZIP, Country"
        country = parts[parts.length - 1];
        city = parts[parts.length - 3];
      } else if (parts.length === 3) {
        // Could be "City, State ZIP, Country" or "Street, City, Country"
        country = parts[parts.length - 1];
        // Check if middle part looks like a state (contains numbers/abbreviation)
        const middlePart = parts[parts.length - 2];
        if (middlePart.match(/^[A-Z]{2}\s+\d+/)) {
          // It's "State ZIP", so city is first part
          city = parts[0];
        } else {
          // It's likely "City", so use middle part
          city = middlePart;
        }
      } else if (parts.length === 2) {
        country = parts[1];
        city = parts[0];
      } else if (parts.length === 1) {
        country = parts[0];
      }

      return {
        id: p.place_id,
        name: p.name,
        city,
        country,
        address,
        photoUrl: buildPhotoUrl(p),
        googlePlaceId: p.place_id,
      };
    });

    // Post-filter results to ensure they match the search query
    // This prevents irrelevant results from appearing (e.g., "key" matching venues in St. Pete)
    let finalResults = mapped;
    if (q && searchTerms.length > 0) {
      finalResults = mapped.filter((result) => {
        const resultText = `${result.name} ${result.city} ${result.address}`.toLowerCase();
        const resultCity = result.city.toLowerCase();
        const queryLower = q.toLowerCase();
        
        if (isLikelyCitySearch) {
          // For city searches, check if the city matches (allowing for variations)
          // e.g., "key west" should match venues in "Key West"
          // Check if city contains all search words
          const cityContainsAllWords = searchTerms.every(word => 
            resultCity.includes(word)
          );
          
          // Also check if address contains all words (for cases where city parsing might differ)
          const addressContainsAllWords = searchTerms.every(word => 
            result.address.toLowerCase().includes(word)
          );
          
          // Check if query matches city name exactly (case-insensitive)
          const queryMatchesCity = resultCity && (
            queryLower === resultCity || 
            resultCity.includes(queryLower) ||
            queryLower.includes(resultCity)
          );
          
          // Also allow venues with the city name in their name
          const nameContainsAllWords = searchTerms.every(word => resultText.includes(word));
          
          return cityContainsAllWords || addressContainsAllWords || queryMatchesCity || nameContainsAllWords;
        } else {
          // For venue name searches, check if:
          // 1. The full query phrase appears anywhere (most lenient)
          // 2. OR all individual words appear (stricter, but still allows word order flexibility)
          // 3. OR if query matches the city name (treat as city search)
          const fullPhraseMatch = resultText.includes(queryLower);
          const allWordsMatch = searchTerms.every(word => resultText.includes(word));
          const cityMatch = resultCity && (
            resultCity === queryLower ||
            resultCity.includes(queryLower) ||
            queryLower.includes(resultCity) ||
            // Check if all search terms are in the city name
            searchTerms.every(word => resultCity.includes(word))
          );
          
          return fullPhraseMatch || allWordsMatch || cityMatch;
        }
      });
    }

    return NextResponse.json({ results: finalResults });
  } catch (err) {
    console.error('Google Places fetch failed:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Search failed', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 }
    );
  }
}
