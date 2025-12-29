import { supabase } from '@/lib/supabaseClient';
import { mapSupabaseVenues } from '@/lib/mapSupabaseVenues';
import { VenueWithStats } from '@/types/venues';
import { __shouldUseApiRouteInternal, fetchFromApi } from './fetchHelpers';
import { extractVenueId } from '@/lib/utils/slug';

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
 * Get all venues with their review statistics.
 * Uses API route in browser (avoids Supabase auth issues), direct Supabase in SSR/tests.
 * @param forceRefresh - If true, bypasses cache by adding cache-control header
 */
export async function getAllVenues(forceRefresh = false): Promise<{
  data: VenueWithStats[] | null;
  error: VenueServiceError | null;
}> {
  try {
    // Browser → API route (edge-cached, no auth issues)
    if (__shouldUseApiRouteInternal()) {
      const result = await fetchFromApi<VenueWithStats[]>('/api/venues', {
        errorMessage: 'Failed to load venues',
        headers: forceRefresh ? { 'cache-control': 'no-cache' } : {},
      });
      return { data: result.data || [], error: result.error };
    }

    // SSR/Tests → Direct Supabase
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
 * Get a single venue by ID.
 * Uses API route in browser (avoids Supabase auth issues), direct Supabase in SSR/tests.
 */
export async function getVenueById(id: string): Promise<{
  data: Venue | null;
  error: VenueServiceError | null;
}> {
  const resolvedId = extractVenueId(id);

  try {
    // Browser → API route (no auth issues)
    if (__shouldUseApiRouteInternal()) {
      return fetchFromApi<Venue>(`/api/venues/${resolvedId}`, {
        errorMessage: 'Failed to load venue',
      });
    }

    // SSR/Tests → Direct Supabase
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, city, country, address, photo_url, google_place_id')
      .eq('id', resolvedId)
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
 * Uses API route in browser (avoids Supabase auth issues), direct Supabase in SSR/tests.
 * If a Google Places photo URL is provided, it will be cached to Supabase Storage
 * Note: Photo caching happens asynchronously after venue creation
 */
export async function createVenue(input: CreateVenueInput): Promise<{
  data: { id: string } | null;
  error: VenueServiceError | null;
}> {
  try {
    // Browser → API route (avoids Supabase auth timeout issues)
    if (__shouldUseApiRouteInternal()) {
      const result = await fetchFromApi<{ id: string }>('/api/venues', {
        method: 'POST',
        errorMessage: 'Failed to create venue',
        body: {
          name: input.name,
          city: input.city,
          country: input.country,
          address: input.address,
          photo_url: input.photo_url,
          google_place_id: input.google_place_id,
        },
      });
      return { data: result.data, error: result.error };
    }

    // SSR/Tests → Direct Supabase
    const googlePhotoUrl = input.photo_url?.includes('maps.googleapis.com/maps/api/place/photo')
      ? input.photo_url
      : null;
    
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

    const data = result.data as { id: string } | null;
    
    if (!data?.id) {
      return {
        data: null,
        error: {
          message: 'Failed to create venue',
        },
      };
    }

    // If venue has google_place_id but no photo_url, trigger photo backfill in background
    if (input.google_place_id && !googlePhotoUrl && !input.photo_url) {
      fetch('/api/backfill-venue-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: data.id }),
      }).catch((err) => {
        console.warn(`Background photo backfill failed for venue ${data.id}:`, err);
      });
    }

    return { data: { id: data.id }, error: null };
  } catch (err) {
    console.error('Unexpected error creating venue:', err);
    return {
      data: null,
      error: {
        message: 'Failed to create venue',
      },
    };
  }
}
