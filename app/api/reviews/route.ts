import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfigError } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

// Use service role key if available (bypasses RLS for profile creation)
// Falls back to anon key if not set
function getSupabaseKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

type CreateReviewBody = {
  venue_id: string;
  user_id: string;
  reviewer_name?: string | null;
  comment?: string | null;
  score: number;
  sound_score: number;
  vibe_score: number;
  staff_score: number;
  layout_score: number;
  reviewer_role?: 'artist' | 'fan' | null;
};

/**
 * POST /api/reviews - Create a new review
 * Bypasses client-side Supabase auth issues by using REST API directly
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const configError = getSupabaseConfigError({ url: supabaseUrl, anonKey: supabaseAnonKey });
  if (configError) {
    return json(
      { error: configError },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let body: CreateReviewBody;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Validate required fields
  if (!body.venue_id || typeof body.venue_id !== 'string') {
    return json(
      { error: 'venue_id is required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!body.user_id || typeof body.user_id !== 'string') {
    return json(
      { error: 'user_id is required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (typeof body.score !== 'number' || body.score < 1 || body.score > 10) {
    return json(
      { error: 'score must be a number between 1 and 10' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Validate aspect scores if provided
  const aspectScores = ['sound_score', 'vibe_score', 'staff_score', 'layout_score'] as const;
  for (const aspect of aspectScores) {
    const value = body[aspect];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || value < 1 || value > 10) {
        return json(
          { error: `${aspect} must be a number between 1 and 10` },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }
  }

  // Validate reviewer_role if provided
  if (body.reviewer_role !== undefined && body.reviewer_role !== null) {
    if (body.reviewer_role !== 'artist' && body.reviewer_role !== 'fan') {
      return json(
        { error: 'reviewer_role must be "artist" or "fan"' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  try {
    // First, ensure profile exists (required by DB trigger)
    // Use service role key if available to bypass RLS
    const serviceKey = getSupabaseKey();
    const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
    
    const profileRes = await fetch(profileUrl.toString(), {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates', // Don't fail if already exists
      },
      body: JSON.stringify({ 
        id: body.user_id, 
        role: body.reviewer_role || 'fan' // Default to fan if not specified
      }),
    });

    // Log profile creation result but don't fail - the review insert will tell us if it worked
    if (!profileRes.ok && profileRes.status !== 409) {
      const profileError = await profileRes.text().catch(() => '');
      console.log('Profile upsert response:', profileRes.status, profileError.slice(0, 100));
    }

    const insertUrl = new URL(`${supabaseUrl}/rest/v1/reviews`);

    const insertData = {
      venue_id: body.venue_id,
      user_id: body.user_id,
      reviewer_name: body.reviewer_name?.trim() || null,
      comment: body.comment?.trim() || null,
      score: body.score,
      sound_score: body.sound_score ?? null,
      vibe_score: body.vibe_score ?? null,
      staff_score: body.staff_score ?? null,
      layout_score: body.layout_score ?? null,
      reviewer_role: body.reviewer_role ?? null,
    };

    console.log('Inserting review with user_id:', body.user_id, 'venue_id:', body.venue_id);
    const insertRes = await fetch(insertUrl.toString(), {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(insertData),
    });

    if (!insertRes.ok) {
      const errorText = await insertRes.text().catch(() => 'Unknown error');
      console.error('Error creating review:', insertRes.status, errorText);

      // Check for duplicate constraint violation (23505)
      const isDuplicate = errorText.includes('23505') || errorText.includes('duplicate');
      
      if (isDuplicate) {
        // Try to fetch the existing review so the client can display it
        try {
          const fetchUrl = new URL(`${supabaseUrl}/rest/v1/reviews`);
          fetchUrl.searchParams.set('select', 'id,reviewer_name,score,comment,created_at,sound_score,vibe_score,staff_score,layout_score,user_id,reviewer_role');
          fetchUrl.searchParams.set('venue_id', `eq.${body.venue_id}`);
          fetchUrl.searchParams.set('user_id', `eq.${body.user_id}`);
          fetchUrl.searchParams.set('limit', '1');
          
          const existingRes = await fetch(fetchUrl.toString(), {
            headers: {
              apikey: supabaseAnonKey!,
              Authorization: `Bearer ${supabaseAnonKey!}`,
            },
          });
          
          if (existingRes.ok) {
            const existingData = (await existingRes.json()) as unknown[];
            if (existingData && existingData.length > 0) {
              const existingReview = existingData[0] as Record<string, unknown>;
              const mapped = {
                id: existingReview.id,
                reviewer: existingReview.reviewer_name,
                score: existingReview.score,
                comment: existingReview.comment,
                created_at: existingReview.created_at,
                sound_score: existingReview.sound_score,
                vibe_score: existingReview.vibe_score,
                staff_score: existingReview.staff_score,
                layout_score: existingReview.layout_score,
                user_id: existingReview.user_id,
                reviewer_role: existingReview.reviewer_role,
              };
              
              console.log('Duplicate review found - returning existing review:', mapped.id, 'user_id:', mapped.user_id);
              return json(
                { 
                  error: "You've already left a report card for this venue from this browser.",
                  code: '23505',
                  isDuplicate: true,
                  data: mapped, // Include the existing review
                },
                { status: 409, headers: { 'Cache-Control': 'no-store' } }
              );
            }
          }
        } catch (fetchErr) {
          console.error('Error fetching existing review on duplicate:', fetchErr);
        }
        
        return json(
          { 
            error: "You've already left a report card for this venue from this browser.",
            code: '23505',
            isDuplicate: true,
          },
          { status: 409, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // Check for RLS policy violation or missing profile
      const isRlsOrProfile = errorText.includes('P0001') || 
                             errorText.includes('profile') || 
                             errorText.includes('violates row-level security');
      
      // If missing profile and no service key, give admin guidance
      const needsServiceKey = isRlsOrProfile && !process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      return json(
        { 
          error: isRlsOrProfile 
            ? needsServiceKey
              ? 'Server configuration required. Admin: add SUPABASE_SERVICE_ROLE_KEY to enable anonymous reviews.'
              : 'Profile required to create review. Please refresh and try again.'
            : 'Failed to create review',
          details: process.env.NODE_ENV === 'development' ? errorText : undefined,
        },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    let rawData: unknown[];
    try {
      rawData = (await insertRes.json()) as unknown[];
    } catch (jsonErr) {
      console.error('Failed to parse review insert response:', jsonErr);
      const responseText = await insertRes.text().catch(() => 'Could not read response');
      console.error('Response text:', responseText);
      return json(
        { error: 'Failed to parse server response' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!Array.isArray(rawData) || rawData.length === 0) {
      console.error('Review insert returned invalid data:', rawData);
      return json(
        { error: 'Server returned invalid response' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const review = rawData[0] as Record<string, unknown>;
    
    if (!review || !review.id) {
      console.error('Review insert response missing required fields:', review);
      return json(
        { error: 'Server response missing required data' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    console.log('Review created successfully - id:', review.id, 'user_id:', review.user_id, 'venue_id:', review.venue_id);

    // Map to frontend expected shape
    const mapped = {
      id: review.id,
      reviewer: review.reviewer_name,
      score: review.score,
      comment: review.comment,
      created_at: review.created_at,
      sound_score: review.sound_score,
      vibe_score: review.vibe_score,
      staff_score: review.staff_score,
      layout_score: review.layout_score,
      user_id: review.user_id,
      reviewer_role: review.reviewer_role,
    };

    return json(
      { data: mapped },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Unexpected error creating review:', err);
    return json(
      { error: 'Failed to create review' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

