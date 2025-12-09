import { VenueWithStats } from '@/types/venues';

export function mapSupabaseVenues(raw: any[]): VenueWithStats[] {
  return (raw || []).map((v) => {
    const reviews = v.reviews || [];
    const reviewCount = reviews.length;
    const latestReviewAt =
      reviewCount > 0
        ? reviews
            .map((r: { created_at?: string | null }) => r?.created_at)
            .filter(Boolean)
            .sort((a: string, b: string) => (a > b ? -1 : 1))[0] || null
        : null;
    const avgScore =
      reviewCount > 0
        ? reviews.reduce(
            (sum: number, r: { score: number }) => sum + r.score,
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
