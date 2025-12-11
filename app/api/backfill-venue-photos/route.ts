import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * API route to backfill photos for existing venues that have google_place_id but no photo_url
 * 
 * This route:
 * 1. Finds venues with google_place_id but no photo_url
 * 2. Fetches photos from Google Places API
 * 3. Caches them to Supabase Storage
 * 4. Updates venue records
 * 
 * Usage: POST /api/backfill-venue-photos
 * Optional query params:
 *   - limit: number of venues to process (default: 10)
 *   - venueId: specific venue ID to process
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let limit = parseInt(searchParams.get('limit') || '10', 10);
    let venueId = searchParams.get('venueId');
    
    // Also check request body for venueId (for client-side calls)
    try {
      const body = await req.json();
      if (body?.venueId && !venueId) {
        venueId = body.venueId;
      }
    } catch {
      // Body parsing failed or empty, use query params only
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Find venues that need photos
    let query = supabase
      .from('venues')
      .select('id, name, google_place_id')
      .not('google_place_id', 'is', null)
      .is('photo_url', null);

    if (venueId) {
      query = query.eq('id', venueId);
    } else {
      query = query.limit(limit);
    }

    const { data: venues, error: venuesError } = await query;

    if (venuesError) {
      console.error('Error fetching venues:', venuesError);
      return NextResponse.json(
        { error: 'Failed to fetch venues', details: venuesError.message },
        { status: 500 }
      );
    }

    if (!venues || venues.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No venues need photo backfilling',
        processed: 0,
      });
    }

    const results = [];
    
    for (const venue of venues) {
      if (!venue.google_place_id) continue;

      try {
        // Fetch photo from Google Places API
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(venue.google_place_id)}&fields=photos&key=${apiKey}`;
        
        const response = await fetch(detailsUrl);
        if (!response.ok) {
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            success: false,
            error: `Failed to fetch place details: ${response.status}`,
          });
          continue;
        }

        const data = await response.json();
        
        // Check for invalid place_id errors
        if (data.status === 'NOT_FOUND' || data.status === 'INVALID_REQUEST') {
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            success: false,
            error: `Invalid place_id: ${data.status}. This venue likely has a fake place_id from test data.`,
          });
          continue;
        }
        
        if (data.status !== 'OK' || !data.result?.photos || data.result.photos.length === 0) {
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            success: false,
            error: data.status === 'OK' ? 'No photos available for this venue' : `Google API error: ${data.status}`,
          });
          continue;
        }

        // Prefer a better photo than just photos[0].
        // Heuristic: take top few photos, prefer landscape + higher resolution.
        const photos: Array<{ photo_reference: string; width?: number; height?: number }> = data.result.photos;
        const ranked = [...photos]
          .filter((p) => p?.photo_reference)
          .map((p, idx) => {
            const w = typeof p.width === 'number' ? p.width : 0;
            const h = typeof p.height === 'number' ? p.height : 0;
            const isLandscape = w > 0 && h > 0 ? w >= h : true;
            const area = w > 0 && h > 0 ? w * h : 0;
            const score =
              (isLandscape ? 1_000_000_000 : 0) +
              area +
              w * 10_000 -
              idx;
            return { ref: p.photo_reference, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        let picked: {
          imageBytes: Uint8Array;
          contentType: string;
        } | null = null;

        for (const candidate of ranked) {
          const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(candidate.ref)}&key=${apiKey}`;
          const photoResponse = await fetch(photoUrl);
          if (!photoResponse.ok) continue;

          const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
          const imageBuffer = await photoResponse.arrayBuffer();
          const imageBytes = new Uint8Array(imageBuffer);

          // Skip tiny images (often icons/tiles)
          if (imageBytes.length < 25_000) continue;

          picked = { imageBytes, contentType };
          break;
        }

        if (!picked) {
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            success: false,
            error: 'Failed to fetch a usable photo (tried multiple candidates)',
          });
          continue;
        }

        // Determine file extension
        const extension = picked.contentType.includes('png') ? 'png' : 'jpg';
        const fileName = `${venue.id}-${Date.now()}.${extension}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('venue-photos')
          .upload(fileName, picked.imageBytes, {
            contentType: picked.contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading to Supabase Storage:', uploadError);
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            success: false,
            error: `Failed to upload photo: ${uploadError.message}`,
          });
          continue;
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('venue-photos')
          .getPublicUrl(fileName);

        if (!urlData?.publicUrl) {
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            success: false,
            error: 'Failed to get public URL',
          });
          continue;
        }

        // Update the venue
        const { error: updateError } = await supabase
          .from('venues')
          .update({ photo_url: urlData.publicUrl })
          .eq('id', venue.id);

        if (updateError) {
          console.error('Error updating venue photo_url:', updateError);
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            success: false,
            error: `Failed to update venue: ${updateError.message}`,
          });
          continue;
        }

        results.push({
          venueId: venue.id,
          venueName: venue.name,
          success: true,
          photoUrl: urlData.publicUrl,
        });
      } catch (error) {
        console.error(`Error processing venue ${venue.id}:`, error);
        results.push({
          venueId: venue.id,
          venueName: venue.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      processed: venues.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    console.error('Error backfilling venue photos:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
