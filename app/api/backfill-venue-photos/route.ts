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
        
        if (data.status !== 'OK' || !data.result?.photos || data.result.photos.length === 0) {
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            success: false,
            error: 'No photos available for this venue',
          });
          continue;
        }

        // Get the first photo
        const photo = data.result.photos[0];
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(photo.photo_reference)}&key=${apiKey}`;

        // Fetch the photo binary
        const photoResponse = await fetch(photoUrl);
        if (!photoResponse.ok) {
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            success: false,
            error: `Failed to fetch photo: ${photoResponse.status}`,
          });
          continue;
        }

        // Get the image as a buffer
        const imageBuffer = await photoResponse.arrayBuffer();
        const imageBytes = new Uint8Array(imageBuffer);

        // Determine file extension
        const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
        const extension = contentType.includes('png') ? 'png' : 'jpg';
        const fileName = `${venue.id}-${Date.now()}.${extension}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('venue-photos')
          .upload(fileName, imageBytes, {
            contentType,
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
