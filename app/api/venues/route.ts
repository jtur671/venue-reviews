import { NextRequest, NextResponse } from 'next/server';
import { mapSupabaseVenues } from '@/lib/mapSupabaseVenues';
import { getSupabaseConfigError } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const configError = getSupabaseConfigError({ url: supabaseUrl, anonKey: supabaseAnonKey });
  if (configError) {
    return json(
      { error: configError },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: 'Invalid request body' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  // Validate required fields
  if (!body.name || !body.city) {
    return json(
      { error: 'Name and city are required' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  // Prepare venue data
  const googlePhotoUrl = body.photo_url?.includes('maps.googleapis.com/maps/api/place/photo')
    ? body.photo_url
    : null;

  const venueData = {
    name: body.name.trim(),
    city: body.city.trim(),
    country: body.country?.trim() || 'USA',
    address: body.address?.trim() || null,
    photo_url: googlePhotoUrl ? null : (body.photo_url || null), // Don't store Google URLs directly
    google_place_id: body.google_place_id || null,
  };

  const url = new URL(`${supabaseUrl}/rest/v1/venues`);
  
  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(venueData),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error('Error creating venue:', res.status, errorText);
      return json(
        { error: 'Failed to create venue', details: errorText.slice(0, 200) },
        {
          status: 502,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const raw = (await res.json()) as unknown[];
    if (!raw || raw.length === 0) {
      return json(
        { error: 'Venue created but no data returned' },
        {
          status: 502,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const venue = raw[0] as { id: string };
    
    // If venue has google_place_id but no photo_url, trigger photo backfill in background
    if (body.google_place_id && !googlePhotoUrl && !body.photo_url) {
      // Trigger backfill asynchronously (non-blocking)
      fetch(`${request.nextUrl.origin}/api/backfill-venue-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: venue.id }),
      }).catch((err) => {
        console.warn(`Background photo backfill failed for venue ${venue.id}:`, err);
      });
    }

    return json(
      { data: { id: venue.id } },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    console.error('Error creating venue:', err);
    return json(
      { error: 'Failed to create venue' },
      {
        status: 502,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const configError = getSupabaseConfigError({ url: supabaseUrl, anonKey: supabaseAnonKey });
  if (configError) {
    return json(
      { error: configError },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const url = new URL(`${supabaseUrl}/rest/v1/venues`);
  url.searchParams.set(
    'select',
    'id,name,city,photo_url,google_place_id,reviews(score,created_at,reviewer_role)'
  );
  url.searchParams.set('order', 'name.asc');

  // Check if client wants to bypass cache
  const cacheControl = request.headers.get('cache-control');
  const bypassCache = cacheControl === 'no-cache';

  try {
    const res = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
      },
      // Let Next/Vercel cache at the edge and revalidate periodically.
      // But bypass cache if client requests it (e.g., after creating a venue)
      next: bypassCache ? { revalidate: 0 } : { revalidate: 60 },
    });

    if (!res.ok) {
      return json(
        { error: 'Failed to load venues' },
        {
          status: 502,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const raw = (await res.json()) as unknown[];
    const data = mapSupabaseVenues(raw as any);

    return json(
      { data },
      {
        status: 200,
        headers: {
          // Vercel CDN cache: 1m fresh, allow 5m stale while revalidating
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    console.error('Error fetching venues from Supabase REST:', err);
    return json(
      { error: 'Failed to load venues' },
      {
        status: 502,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}


