import Link from 'next/link';
import { StarRating } from '@/components/StarRating';
import { VenueWithStats } from '@/types/venues';

type VenueListProps = {
  venues: VenueWithStats[];
  loading: boolean;
  label?: string;
};

export function VenueList({ venues, loading, label }: VenueListProps) {
  if (loading) {
    return (
      <section className="section">
        <p className="section-subtitle">Loading venues…</p>
      </section>
    );
  }

  if (!loading && venues.length === 0) {
    return (
      <section className="section">
        <p className="section-subtitle">
          No venues match your filters yet. Try a different search or add one below.
        </p>
      </section>
    );
  }

  const count = venues.length;
  const countText = `${count} venue${count === 1 ? '' : 's'}`;

  return (
    <section className="section">
      <p className="section-subtitle" style={{ marginBottom: '0.5rem' }}>
        {label ? `${countText} · ${label}` : countText}
      </p>

      <ul className="venue-list">
        {venues.map((v) => (
          <li key={v.id} style={{ marginBottom: '0.6rem' }}>
            <Link href={`/venues/${v.id}`} className="card venue-card">
              <div className="venue-card-main">
                <div className="venue-name">{v.name}</div>
                <div className="venue-city">{v.city}</div>
              </div>
              <div className="venue-score">
                {v.avgScore !== null ? (
                  <>
                    <div className="venue-score-main">
                      <StarRating score={v.avgScore} /> {v.avgScore.toFixed(1)}/10
                    </div>
                    <div className="venue-score-sub">
                      {v.reviewCount} review{v.reviewCount === 1 ? '' : 's'}
                    </div>
                  </>
                ) : (
                  <div className="venue-score-sub">No ratings yet</div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
