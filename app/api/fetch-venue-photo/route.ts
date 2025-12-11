import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to fetch a venue photo from Google Places API using place_id
 * This can be used to refresh or get photos for existing venues
 * 
 * Usage: GET /api/fetch-venue-photo?placeId=ChIJ...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json(
        { error: 'placeId is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Use Place Details API to get photos
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${apiKey}`;
    
    const response = await fetch(detailsUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch place details' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (data.status !== 'OK' || !data.result?.photos || data.result.photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos available for this venue' },
        { status: 404 }
      );
    }

    // Get the first photo (most relevant)
    const photo = data.result.photos[0];
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(photo.photo_reference)}&key=${apiKey}`;

    return NextResponse.json({
      success: true,
      photoUrl,
      photoReference: photo.photo_reference,
    });
  } catch (error) {
    console.error('Error fetching venue photo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
