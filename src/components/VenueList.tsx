import Link from 'next/link';
import { RatingIcons } from '@/components/RatingIcons';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { VenueWithStats } from '@/types/venues';
import { formatScore } from '@/lib/utils/scores';

type VenueListProps = {
  venues: VenueWithStats[];
  loading: boolean;
  label?: string;
};

export function VenueList({ venues, loading, label }: VenueListProps) {
  if (loading) {
    return <LoadingState message="Loading venues…" />;
  }

  if (!loading && venues.length === 0) {
    return (
      <EmptyState message="No venues match your filters yet. Try a different search or add one below." />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div className="venue-name">{v.name}</div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontWeight: 400,
                    }}
                  >
                    {v.city} • USA
                  </span>
                </div>
                <div className="venue-city" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  {v.reviewCount > 0
                    ? `${v.reviewCount} review${v.reviewCount === 1 ? '' : 's'} • Community report card`
                    : 'No ratings yet'}
                </div>
              </div>
              <div className="venue-score" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                <RatingIcons score={v.avgScore} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {formatScore(v.avgScore)}/10
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
