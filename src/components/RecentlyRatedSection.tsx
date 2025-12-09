import Link from 'next/link';
import { RatingIcons } from './RatingIcons';
import { EmptyState } from './EmptyState';
import { VenueWithStats } from '@/types/venues';
import { formatScore } from '@/lib/utils/scores';

type RecentlyRatedSectionProps = {
  venues: VenueWithStats[];
};

export function RecentlyRatedSection({ venues }: RecentlyRatedSectionProps) {
  return (
    <section className="section">
      <div className="card hero-card">
        <div className="section-header section-header-spaced">
          <h2 className="section-title">Recently rated</h2>
          <p className="section-subtitle text-sm mt-sm">
            Fresh report cards from the last week.
          </p>
        </div>
        {venues.length ? (
          <ul className="venue-list list-reset">
            {venues.map((v) => (
              <li key={v.id} className="recently-card-item">
                <Link href={`/venues/${v.id}`} className="recently-card card-padding-sm">
                  <div className="recently-main">
                    <div className="recently-name">{v.name}</div>
                    <div className="recently-meta">{v.city} · USA</div>
                    <div className="recently-meta">
                      {v.reviewCount === 1 ? '1 review' : `${v.reviewCount} reviews`} · Community report card
                    </div>
                  </div>
                  <div className="recently-rating">
                    <RatingIcons score={v.avgScore} />
                    <div className="recently-rating-text">{v.avgScore?.toFixed(1) ?? '—'}/10</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="Ratings will appear here as the community weighs in." />
        )}
      </div>
    </section>
  );
}
