import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfigError } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
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
        return json(
          { 
            error: "You've already left a report card for this venue from this browser.",
            code: '23505',
            isDuplicate: true,
          },
          { status: 409, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      return json(
        { error: 'Failed to create review' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const rawData = (await insertRes.json()) as unknown[];
    const review = rawData[0] as Record<string, unknown>;

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

