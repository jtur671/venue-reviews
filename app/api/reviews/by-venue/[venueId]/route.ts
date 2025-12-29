import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfigError } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const { venueId } = await params;
  
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

  const url = new URL(`${supabaseUrl}/rest/v1/reviews`);
  url.searchParams.set(
    'select',
    'id,reviewer_name,score,comment,created_at,sound_score,vibe_score,staff_score,layout_score,user_id,reviewer_role'
  );
  url.searchParams.set('venue_id', `eq.${venueId}`);
  url.searchParams.set('order', 'created_at.desc');

  try {
    // Check for cache-busting header from client
    const cacheControl = _request.headers.get('cache-control');
    const shouldBypassCache = cacheControl === 'no-cache';
    
    const res = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
      },
      // Short cache for reviews since they change frequently, but bypass if requested
      next: shouldBypassCache ? { revalidate: 0 } : { revalidate: 10 },
    });

    if (!res.ok) {
      return json(
        { error: 'Failed to load reviews' },
        {
          status: 502,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const raw = (await res.json()) as unknown[];
    
    console.log(`Fetched ${raw?.length || 0} reviews for venue ${venueId}, user_ids:`, (raw || []).map((r: any) => r.user_id));
    
    // Map reviewer_name to reviewer for frontend compatibility
    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      reviewer: r.reviewer_name,
      score: r.score,
      comment: r.comment,
      created_at: r.created_at,
      sound_score: r.sound_score,
      vibe_score: r.vibe_score,
      staff_score: r.staff_score,
      layout_score: r.layout_score,
      user_id: r.user_id,
      reviewer_role: r.reviewer_role,
    }));

    return json(
      { data: mapped },
      {
        status: 200,
        headers: {
          // Short cache for reviews
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (err) {
    console.error('Error fetching reviews from Supabase REST:', err);
    return json(
      { error: 'Failed to load reviews' },
      {
        status: 502,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

