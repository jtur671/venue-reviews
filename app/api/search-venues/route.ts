import { NextRequest, NextResponse } from 'next/server';

type GooglePlace = {
  place_id: string;
  name: string;
  formatted_address?: string;
  types?: string[];
  photos?: Array<{
    photo_reference: string;
  }>;
};

function buildPhotoUrl(place: GooglePlace): string | null {
  const photo = place.photos?.[0];
  if (!photo) return null;

  const ref = photo.photo_reference;
  if (!ref) return null;

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(
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
  
  // Common city name patterns (multi-word cities)
  const commonCityPatterns = [
    'new orleans', 'new york', 'new jersey', 'new mexico', 'new hampshire',
    'key west', 'key largo', 'west palm', 'palm beach', 'palm springs',
    'san francisco', 'san diego', 'san antonio', 'san jose', 'san mateo',
    'los angeles', 'las vegas', 'las cruces',
    'kansas city', 'oakland city', 'salt lake', 'lake tahoe',
    'st louis', 'st paul', 'st petersburg', 'st augustine',
    'fort worth', 'fort lauderdale', 'fort myers',
    'virginia beach', 'myrtle beach', 'daytona beach',
    'colorado springs', 'rapid city', 'sioux falls',
  ];
  
  // Common venue name keywords - if present, treat as venue search
  const venueKeywords = ['ballroom', 'hall', 'club', 'theater', 'theatre', 'venue', 'bar', 'lounge', 'tavern', 'pub'];
  const hasVenueKeywords = venueKeywords.some(keyword => q.toLowerCase().includes(keyword));
  
  // Check if query matches a known city pattern exactly
  const matchesCityPattern = commonCityPatterns.some(pattern => 
    q.toLowerCase() === pattern
  );
  
  // Determine if this is likely a city search
  // Must match a city pattern AND not have venue keywords
  const isLikelyCitySearch = matchesCityPattern && !hasVenueKeywords;

  if (q && cityParam) {
    // User typed a venue + picked a city
    effectiveQuery = `${q} in ${cityParam}`;
  } else if (q && !cityParam) {
    const wordCount = searchTerms.length;

    if (wordCount === 1) {
      // Single word: search as venue name (not city) to avoid irrelevant results
      // This prevents "key" from matching venues in random cities
      effectiveQuery = `${q} live music venue`;
    } else if (isLikelyCitySearch) {
      // Multi-word that looks like a city: search for venues in that city
      effectiveQuery = `live music venues in ${q}`;
    } else {
      // Multi-word: treat as venue name
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
    return new NextResponse('Missing GOOGLE_PLACES_API_KEY', { status: 500 });
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
      return new NextResponse('Upstream error', { status: 502 });
    }

    const json = JSON.parse(text);

    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      console.error('Google Places API status:', json.status, json.error_message);
      return new NextResponse('Places API error', { status: 502 });
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
          // For venue name searches, all search words must appear in the result
          // This ensures "key" only matches venues with "key" in name/city/address
          // and "key west" only matches venues with both "key" and "west"
          return searchTerms.every(word => resultText.includes(word));
        }
      });
    }

    return NextResponse.json({ results: finalResults });
  } catch (err) {
    console.error('Google Places fetch failed:', err);
    return new NextResponse('Search error', { status: 500 });
  }
}
