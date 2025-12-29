import { NextRequest, NextResponse } from 'next/server';
import { mapSupabaseVenues } from '@/lib/mapSupabaseVenues';
import { getSupabaseConfigError } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
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


