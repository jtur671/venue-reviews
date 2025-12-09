import Link from 'next/link';
import { RatingIcons } from '@/components/RatingIcons';
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
                  {v.avgScore?.toFixed(1) ?? '—'}/10
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
