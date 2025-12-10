import { VenueWithStats } from '@/types/venues';

type SupabaseVenueRaw = {
  id: string;
  name: string;
  city: string;
  reviews?: Array<{
    score: number;
    created_at?: string | null;
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
    const avgScore =
      reviewCount > 0
        ? reviews.reduce(
            (sum, r) => sum + r.score,
            0
          ) / reviewCount
        : null;

    return {
      id: v.id,
      name: v.name,
      city: v.city,
      avgScore,
      reviewCount,
      latestReviewAt,
    };
  });
}
