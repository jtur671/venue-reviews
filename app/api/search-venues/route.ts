import { NextRequest, NextResponse } from 'next/server';

type GooglePlace = {
  place_id: string;
  name: string;
  formatted_address?: string;
  types?: string[];
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const cityParam = (searchParams.get('city') ?? '').trim();

  // Build a smarter text query
  let effectiveQuery = '';

  if (q && cityParam) {
    // User typed a venue + picked a city
    effectiveQuery = `${q} in ${cityParam}`;
  } else if (q && !cityParam) {
    const wordCount = q.split(/\s+/).length;

    if (wordCount === 1) {
      effectiveQuery = `live music venues in ${q}`;
    } else {
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
      if (parts.length >= 2) {
        country = parts[parts.length - 1];
        city = parts[parts.length - 2];
      }

      return {
        id: p.place_id,
        name: p.name,
        city,
        country,
        address,
      };
    });

    return NextResponse.json({ results: mapped });
  } catch (err) {
    console.error('Google Places fetch failed:', err);
    return new NextResponse('Search error', { status: 500 });
  }
}
