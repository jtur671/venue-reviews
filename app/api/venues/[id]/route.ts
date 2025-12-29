import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfigError } from '@/lib/supabaseClient';
import { extractVenueId } from '@/lib/utils/slug';

export const runtime = 'nodejs';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = extractVenueId(rawId);

  if (!id) {
    return json(
      { error: 'Venue id is required' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
  
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
  url.searchParams.set('select', 'id,name,city,country,address,photo_url,google_place_id');
  url.searchParams.set('id', `eq.${id}`);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
      },
      // Cache individual venues for shorter time since they're less frequently accessed
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return json(
        { error: 'Failed to load venue' },
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
        { error: 'Venue not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    return json(
      { data: raw[0] },
      {
        status: 200,
        headers: {
          // Short cache for individual venue data
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('Error fetching venue from Supabase REST:', err);
    return json(
      { error: 'Failed to load venue' },
      {
        status: 502,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

