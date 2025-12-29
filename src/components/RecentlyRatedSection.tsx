import { memo } from 'react';
import Link from 'next/link';
import { EmptyState } from './EmptyState';
import { VenueWithStats } from '@/types/venues';
import { scoreToGrade, gradeColor } from '@/lib/utils/grades';
import { buildVenuePath } from '@/lib/utils/slug';

type RecentlyRatedSectionProps = {
  venues: VenueWithStats[];
};

export const RecentlyRatedSection = memo(function RecentlyRatedSection({ venues }: RecentlyRatedSectionProps) {
  return (
    <div>
      <div className="section-header section-header-spaced">
        <h2 className="section-title">Recently rated</h2>
        <p className="section-subtitle text-sm mt-sm">
          Fresh report cards from the last week.
        </p>
      </div>
        {venues.length ? (
          <ul className="venue-list venue-list--grid list-reset">
            {venues.map((v) => {
              const grade = scoreToGrade(v.avgScore);
              const color = gradeColor(grade);
              return (
                <li key={v.id} className="recently-card-item">
                  <Link 
                    href={buildVenuePath(v)} 
                    className="recently-card card-padding-sm"
                    aria-label={`${v.name} in ${v.city}, ${grade ? `grade ${grade}` : 'no rating yet'}`}
                  >
                    <div className="recently-main">
                      <div className="recently-name-row">
                        <div className="recently-name">{v.name}</div>
                        {grade && (
                          <span
                            className="venue-grade-chip"
                            style={{ backgroundColor: `${color}22`, color }}
                            aria-label={`Grade ${grade}`}
                          >
                            {grade}
                          </span>
                        )}
                      </div>
                      <div className="recently-meta">{v.city} · USA</div>
                      <div className="recently-meta">
                        {v.reviewCount === 1 ? '1 review' : `${v.reviewCount} reviews`} · Community report card
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message="Ratings will appear here as the community weighs in." />
        )}
    </div>
  );
});
