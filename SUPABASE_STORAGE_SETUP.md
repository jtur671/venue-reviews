# Supabase Storage Setup for Venue Photos

## Overview

The app now caches Google Places photos to Supabase Storage to avoid depending on Google's photo URLs forever. This ensures photos remain available even if Google URLs expire.

## Setup Instructions

### 1. Create the Storage Bucket

1. Go to your Supabase dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name it: `venue-photos`
5. Set it to **Public** (so photos can be accessed via public URLs)
6. Click **Create bucket**

### 2. Configure Bucket Policies (Optional but Recommended)

For security, you can add RLS policies:

```sql
-- Allow public read access
CREATE POLICY "Public read access for venue photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'venue-photos');

-- Allow authenticated users to upload (if you want to restrict uploads)
CREATE POLICY "Authenticated users can upload venue photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'venue-photos' AND
  auth.role() = 'authenticated'
);
```

Or for anonymous uploads (current implementation):

```sql
-- Allow anonymous uploads (for the API route)
CREATE POLICY "Allow anonymous uploads to venue-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'venue-photos');
```

### 3. How It Works

1. When a venue is created with a Google Places photo URL:
   - The venue is created first (without the photo_url)
   - The app automatically calls `/api/cache-venue-photo` to:
     - Fetch the photo from Google Places API
     - Upload it to Supabase Storage
     - Update the venue's `photo_url` with the Supabase Storage URL

2. Future requests will use the cached Supabase Storage URL instead of Google's URL

### 4. Manual Photo Caching

You can also manually cache photos for existing venues:

```bash
curl -X POST http://localhost:3000/api/cache-venue-photo \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrl": "https://maps.googleapis.com/maps/api/place/photo?...",
    "venueId": "venue-id-here"
  }'
```

### 5. Benefits

- **Persistence**: Photos remain available even if Google URLs expire
- **Performance**: Faster loading from Supabase CDN
- **Cost Control**: One-time fetch from Google, then served from Supabase
- **Reliability**: No dependency on Google's photo service availability

## Troubleshooting

### Error: "Bucket not found"
- Make sure you've created the `venue-photos` bucket in Supabase Storage
- Check that the bucket name matches exactly (case-sensitive)

### Error: "Permission denied"
- Ensure the bucket is set to **Public**
- Check RLS policies if you've added them

### Photos not updating
- Check browser console for errors
- Verify the API route is accessible
- Check Supabase Storage logs in the dashboard
