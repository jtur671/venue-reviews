import { VenueWithStats } from '@/types/venues';

type SupabaseVenueRaw = {
  id: string;
  name: string;
  city: string;
  photo_url?: string | null;
  google_place_id?: string | null;
  reviews?: Array<{
    score: number;
    created_at?: string | null;
    reviewer_role?: 'artist' | 'fan' | null;
  }>;
};

export function mapSupabaseVenues(raw: SupabaseVenueRaw[]): VenueWithStats[] {
  return (raw || []).map((v) => {
    const reviews = v.reviews || [];
    const reviewCount = reviews.length;
    const latestReviewAt =
      reviewCount > 0
        ? (reviews
            .map((r) => r?.created_at)
            .filter((date): date is string => typeof date === 'string' && date.length > 0)
            .sort((a, b) => (a > b ? -1 : 1))[0] || null)
        : null;
    
    // Calculate overall average
    const avgScore =
      reviewCount > 0
        ? reviews.reduce(
            (sum, r) => sum + r.score,
            0
          ) / reviewCount
        : null;

    // Separate artist and fan reviews
    const artistReviews = reviews.filter((r) => r.reviewer_role === 'artist');
    const fanReviews = reviews.filter((r) => r.reviewer_role === 'fan');
    
    const artistCount = artistReviews.length;
    const fanCount = fanReviews.length;
    
    const artistScore =
      artistCount > 0
        ? artistReviews.reduce((sum, r) => sum + r.score, 0) / artistCount
        : null;
    
    const fanScore =
      fanCount > 0
        ? fanReviews.reduce((sum, r) => sum + r.score, 0) / fanCount
        : null;

    return {
      id: v.id,
      name: v.name,
      city: v.city,
      avgScore,
      reviewCount,
      latestReviewAt,
      photo_url: v.photo_url || null,
      google_place_id: v.google_place_id || null,
      artistScore,
      fanScore,
      artistCount,
      fanCount,
    } as VenueWithStats;
  });
}
