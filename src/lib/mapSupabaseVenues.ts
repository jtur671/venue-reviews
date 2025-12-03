import { VenueWithStats } from '@/types/venues';

export function mapSupabaseVenues(raw: any[]): VenueWithStats[] {
  return (raw || []).map((v) => {
    const reviews = v.reviews || [];
    const reviewCount = reviews.length;
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
    };
  });
}
