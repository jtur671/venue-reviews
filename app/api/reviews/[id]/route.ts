import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfigError } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

type UpdateReviewBody = {
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
 * PUT /api/reviews/[id] - Update an existing review
 * Requires user_id in body for authorization (only owner can update)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const configError = getSupabaseConfigError({ url: supabaseUrl, anonKey: supabaseAnonKey });
  if (configError) {
    return json(
      { error: configError },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let body: UpdateReviewBody;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Validate user_id (required for authorization)
  if (!body.user_id || typeof body.user_id !== 'string') {
    return json(
      { error: 'user_id is required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Validate score
  if (typeof body.score !== 'number' || body.score < 1 || body.score > 10) {
    return json(
      { error: 'score must be a number between 1 and 10' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Validate aspect scores
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
    const updateUrl = new URL(`${supabaseUrl}/rest/v1/reviews`);
    // Filter by id AND user_id (authorization)
    updateUrl.searchParams.set('id', `eq.${id}`);
    updateUrl.searchParams.set('user_id', `eq.${body.user_id}`);

    const updateData = {
      reviewer_name: body.reviewer_name?.trim() || null,
      comment: body.comment?.trim() || null,
      score: body.score,
      sound_score: body.sound_score ?? null,
      vibe_score: body.vibe_score ?? null,
      staff_score: body.staff_score ?? null,
      layout_score: body.layout_score ?? null,
      reviewer_role: body.reviewer_role ?? null,
    };

    const updateRes = await fetch(updateUrl.toString(), {
      method: 'PATCH',
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updateData),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text().catch(() => 'Unknown error');
      console.error('Error updating review:', updateRes.status, errorText);
      return json(
        { error: 'Failed to update review' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const rawData = (await updateRes.json()) as unknown[];
    
    // No results = review not found or user not authorized
    if (!rawData || rawData.length === 0) {
      return json(
        { error: 'Review not found or not authorized' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

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
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Unexpected error updating review:', err);
    return json(
      { error: 'Failed to update review' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

/**
 * DELETE /api/reviews/[id] - Delete a review
 * Requires user_id query param for authorization (only owner can delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const configError = getSupabaseConfigError({ url: supabaseUrl, anonKey: supabaseAnonKey });
  if (configError) {
    return json(
      { error: configError },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!userId) {
    return json(
      { error: 'user_id query parameter is required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const deleteUrl = new URL(`${supabaseUrl}/rest/v1/reviews`);
    // Filter by id AND user_id (authorization)
    deleteUrl.searchParams.set('id', `eq.${id}`);
    deleteUrl.searchParams.set('user_id', `eq.${userId}`);

    const deleteRes = await fetch(deleteUrl.toString(), {
      method: 'DELETE',
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
        Prefer: 'return=representation',
      },
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text().catch(() => 'Unknown error');
      console.error('Error deleting review:', deleteRes.status, errorText);
      return json(
        { error: 'Failed to delete review' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Check if anything was actually deleted
    const rawData = (await deleteRes.json()) as unknown[];
    if (!rawData || rawData.length === 0) {
      return json(
        { error: 'Review not found or not authorized' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return json(
      { success: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Unexpected error deleting review:', err);
    return json(
      { error: 'Failed to delete review' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

