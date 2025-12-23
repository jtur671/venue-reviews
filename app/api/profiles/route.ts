import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfigError } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/**
 * POST /api/profiles - Create or update a profile with a role
 * Body: { userId: string, role: 'artist' | 'fan' }
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

  let body: { userId?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { userId, role } = body;

  if (!userId || typeof userId !== 'string') {
    return json(
      { error: 'userId is required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (role !== 'artist' && role !== 'fan') {
    return json(
      { error: 'role must be "artist" or "fan"' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    // Try to upsert profile with role (ignoreDuplicates = don't overwrite existing role)
    // Note: This may fail due to RLS policies for anonymous users - that's OK,
    // the client will fall back to localStorage.
    const upsertUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
    
    const upsertRes = await fetch(upsertUrl.toString(), {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify({ id: userId, role }),
    });

    // Check if upsert succeeded
    const upsertOk = upsertRes.ok || upsertRes.status === 409; // 409 = already exists
    
    if (!upsertOk) {
      // RLS or other DB restriction - return success with persisted=false
      // Client will use localStorage (graceful degradation)
      const errorText = await upsertRes.text().catch(() => '');
      console.log('Profile upsert blocked (likely RLS):', upsertRes.status, errorText.slice(0, 100));
      return json(
        { data: { role, persisted: false } },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Try to fetch the profile to get the actual role (in case it already existed)
    const fetchUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
    fetchUrl.searchParams.set('select', 'id,role');
    fetchUrl.searchParams.set('id', `eq.${userId}`);

    const fetchRes = await fetch(fetchUrl.toString(), {
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
      },
    });

    if (!fetchRes.ok) {
      // Non-fatal - return the role we tried to set
      return json({ data: { role, persisted: true } }, { status: 200 });
    }

    const profiles = (await fetchRes.json()) as { id: string; role: string }[];
    const savedRole = profiles[0]?.role || role;

    return json(
      { data: { role: savedRole, persisted: true } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    // Network or other error - return success with persisted=false
    // Client will use localStorage (graceful degradation)
    console.log('Profile API error (graceful degradation):', err);
    return json(
      { data: { role, persisted: false } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

