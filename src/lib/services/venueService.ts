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
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, city, reviews(score, created_at)')
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

/**
 * Get a single venue by ID
 */
export async function getVenueById(id: string): Promise<{
  data: Venue | null;
  error: VenueServiceError | null;
}> {
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

/**
 * Create a new venue
 */
export async function createVenue(input: CreateVenueInput): Promise<{
  data: { id: string } | null;
  error: VenueServiceError | null;
}> {
  const { data, error } = await supabase
    .from('venues')
    .insert({
      name: input.name.trim(),
      city: input.city.trim(),
      country: input.country?.trim() || 'USA',
      address: input.address?.trim() || null,
      photo_url: input.photo_url || null,
      google_place_id: input.google_place_id || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating venue:', error);
    return {
      data: null,
      error: {
        code: error.code,
        message: 'Failed to create venue',
      },
    };
  }

  return { data: { id: data.id }, error: null };
}
