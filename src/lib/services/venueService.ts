import { supabase } from '@/lib/supabaseClient';
import { mapSupabaseVenues } from '@/lib/mapSupabaseVenues';
import { VenueWithStats } from '@/types/venues';

export type Venue = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
  photo_url?: string | null;
  google_place_id?: string | null;
};

export type CreateVenueInput = {
  name: string;
  city: string;
  country?: string;
  address?: string | null;
  photo_url?: string | null;
  google_place_id?: string | null;
};

export type VenueServiceError = {
  code?: string;
  message: string;
};

/**
 * Get all venues with their review statistics
 */
export async function getAllVenues(): Promise<{
  data: VenueWithStats[] | null;
  error: VenueServiceError | null;
}> {
  try {
    // In SSR/tests, use direct Supabase client (relative fetch URLs won't work, and unit tests mock Supabase).
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, city, photo_url, google_place_id, reviews(score, created_at, reviewer_role)')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading venues:', error);
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to load venues',
          },
        };
      }

      const withStats = mapSupabaseVenues(data || []);
      return { data: withStats, error: null };
    }

    // In the browser, use our server route so production can edge-cache and avoid slow/flaky browser->Supabase calls.
    const res = await fetch('/api/venues', { method: 'GET' });
    const body = (await res.json().catch(() => null)) as { data?: VenueWithStats[]; error?: string } | null;

    if (!res.ok) {
      return {
        data: null,
        error: {
          message: body?.error || 'Failed to load venues',
        },
      };
    }

    return { data: body?.data || [], error: null };
  } catch (err) {
    console.error('Unexpected error loading venues:', err);
    return {
      data: null,
      error: {
        message: 'Failed to load venues',
      },
    };
  }
}

/**
 * Get a single venue by ID
 */
export async function getVenueById(id: string): Promise<{
  data: Venue | null;
  error: VenueServiceError | null;
}> {
  try {
    // In SSR/tests, use direct Supabase client (relative fetch URLs won't work, and unit tests mock Supabase).
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, city, country, address, photo_url, google_place_id')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading venue:', error);
        return {
          data: null,
          error: {
            code: error.code,
            message: error.code === 'PGRST116' ? 'Venue not found' : 'Failed to load venue',
          },
        };
      }

      return { data: data as Venue, error: null };
    }

    // In the browser, use our server route to avoid slow/flaky browser->Supabase auth issues.
    const res = await fetch(`/api/venues/${id}`, { method: 'GET' });
    const body = (await res.json().catch(() => null)) as { data?: Venue; error?: string } | null;

    if (!res.ok) {
      return {
        data: null,
        error: {
          message: body?.error || 'Failed to load venue',
        },
      };
    }

    return { data: body?.data || null, error: null };
  } catch (err) {
    console.error('Unexpected error loading venue:', err);
    return {
      data: null,
      error: {
        message: 'Failed to load venue',
      },
    };
  }
}

/**
 * Create a new venue
 * If a Google Places photo URL is provided, it will be cached to Supabase Storage
 * Note: Photo caching happens asynchronously after venue creation
 */
export async function createVenue(input: CreateVenueInput): Promise<{
  data: { id: string } | null;
  error: VenueServiceError | null;
}> {
  // First, create the venue (without photo_url if it's a Google URL)
  const googlePhotoUrl = input.photo_url?.includes('maps.googleapis.com/maps/api/place/photo')
    ? input.photo_url
    : null;
  
  let data: { id: string } | null = null;
  try {
    const result = await supabase
      .from('venues')
      .insert({
        name: input.name.trim(),
        city: input.city.trim(),
        country: input.country?.trim() || 'USA',
        address: input.address?.trim() || null,
        photo_url: googlePhotoUrl ? null : (input.photo_url || null), // Don't store Google URLs directly
        google_place_id: input.google_place_id || null,
      })
      .select('id')
      .single();

    if (result.error) {
      console.error('Error creating venue:', result.error);
      return {
        data: null,
        error: {
          code: result.error.code,
          message: 'Failed to create venue',
        },
      };
    }

    data = result.data as { id: string };
  } catch (err) {
    console.error('Unexpected error creating venue:', err);
    return {
      data: null,
      error: {
        message: 'Failed to create venue',
      },
    };
  }
  
  if (!data?.id) {
    return {
      data: null,
      error: {
        message: 'Failed to create venue',
      },
    };
  }

  // If venue has google_place_id but no photo_url, trigger photo backfill in background
  // This ensures new venues automatically get their photos fetched and cached
  if (input.google_place_id && !googlePhotoUrl && !input.photo_url) {
    // Trigger backfill asynchronously (non-blocking)
    // The backfill API will fetch from Google Places and cache to Supabase Storage
    fetch('/api/backfill-venue-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: data.id }),
    }).catch((err) => {
      console.warn(`Background photo backfill failed for venue ${data.id}:`, err);
      // Non-blocking - venue is already created successfully
    });
  }

  // Photo caching for Google URLs is handled client-side in app/page.tsx
  // This keeps the service layer clean and allows for better error handling

  return { data: { id: data.id }, error: null };
}
