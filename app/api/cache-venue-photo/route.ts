import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * API route to cache a Google Places photo to Supabase Storage
 * 
 * This route:
 * 1. Fetches the photo binary from Google Places API
 * 2. Uploads it to Supabase Storage
 * 3. Returns the public URL
 * 
 * Usage: POST /api/cache-venue-photo
 * Body: { photoUrl: string, venueId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoUrl, venueId } = body;

    if (!photoUrl || !venueId) {
      return NextResponse.json(
        { error: 'photoUrl and venueId are required' },
        { status: 400 }
      );
    }

    // Validate that photoUrl is from Google Places API
    if (!photoUrl.includes('maps.googleapis.com/maps/api/place/photo')) {
      return NextResponse.json(
        { error: 'Invalid photo URL. Must be from Google Places API.' },
        { status: 400 }
      );
    }

    // Fetch the photo from Google
    const photoResponse = await fetch(photoUrl);
    if (!photoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch photo from Google Places API' },
        { status: photoResponse.status }
      );
    }

    // Get the image as a buffer
    const imageBuffer = await photoResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    // Determine file extension from Content-Type or default to jpg
    const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `${venueId}-${Date.now()}.${extension}`;

    // Upload to Supabase Storage
    // Create a 'venue-photos' bucket if it doesn't exist (you'll need to do this in Supabase dashboard)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('venue-photos')
      .upload(fileName, imageBytes, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('Error uploading to Supabase Storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload photo to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('venue-photos')
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to get public URL' },
        { status: 500 }
      );
    }

    // Update the venue with the cached photo URL
    const { error: updateError } = await supabase
      .from('venues')
      .update({ photo_url: urlData.publicUrl })
      .eq('id', venueId);

    if (updateError) {
      console.error('Error updating venue photo_url:', updateError);
      // Don't fail the request - the photo is cached even if the update fails
      // The venue can be updated manually later
    }

    return NextResponse.json({
      success: true,
      photoUrl: urlData.publicUrl,
      venueId,
    });
  } catch (error) {
    console.error('Error caching venue photo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
