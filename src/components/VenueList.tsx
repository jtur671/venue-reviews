import { memo } from 'react';
import Link from 'next/link';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { VenueWithStats } from '@/types/venues';
import { scoreToGrade, gradeColor } from '@/lib/utils/grades';
import { buildVenuePath } from '@/lib/utils/slug';

type VenueListProps = {
  venues: VenueWithStats[];
  loading: boolean;
  label?: string;
};

export const VenueList = memo(function VenueList({ venues, loading, label }: VenueListProps) {
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
      <p className="section-subtitle venue-list-label">
        {label ? `${countText} · ${label}` : countText}
      </p>

      <ul className="venue-list">
        {venues.map((v) => {
          const grade = scoreToGrade(v.avgScore);
          const color = gradeColor(grade);
          return (
            <li key={v.id} className="venue-list-item">
              <Link 
                href={buildVenuePath(v)} 
                className="card venue-card"
                aria-label={`${v.name} in ${v.city}, ${grade ? `grade ${grade}` : 'no rating yet'}`}
              >
                <div className="venue-card-main">
                  <div className="venue-card-header">
                    <div className="venue-name">{v.name}</div>
                    {grade && (
                      <span
                        className="venue-grade-chip"
                        style={{ backgroundColor: `${color}22`, color }}
                        aria-label={`Grade ${grade}`}
                      >
                        {grade}
                      </span>
                    )}
                    <span className="venue-location-chip">
                      {v.city} • USA
                    </span>
                  </div>
                  <div className="venue-card-meta">
                    {v.reviewCount > 0
                      ? `${v.reviewCount} review${v.reviewCount === 1 ? '' : 's'} • Community report card`
                      : 'No ratings yet'}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
});
