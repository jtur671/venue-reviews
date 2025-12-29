import Link from 'next/link';
import { makeVenueKey, makeNameOnlyKey, makeNameWithoutCityKey } from '@/lib/venueKeys';
import { RemoteVenue } from '@/types/venues';
import { ERROR_COLOR, SUCCESS_COLOR_START, SUCCESS_COLOR_END } from '@/constants/ui';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { formatError } from '@/lib/utils/errors';
import { buildVenuePath } from '@/lib/utils/slug';

type RemoteSearchResultsProps = {
  results: RemoteVenue[];
  loading: boolean;
  error?: string | null;
  hasQuery: boolean;
  onSelectVenue: (venue: RemoteVenue) => void;
  existingVenueLookup: Record<string, string>;
  creatingVenue?: boolean;
};

export function RemoteSearchResults({
  results,
  loading,
  error,
  hasQuery,
  onSelectVenue,
  existingVenueLookup,
  creatingVenue = false,
}: RemoteSearchResultsProps) {
  if (!hasQuery) return null;

  return (
    <section className="section card--soft" style={{ padding: '0.9rem 1rem' }}>
      <div className="section-header" style={{ marginBottom: '0.5rem' }}>
        <h2 className="section-title">Search results from the web</h2>
        <p className="section-subtitle">
          Venues found via external data. Some may not have community ratings yet.
        </p>
      </div>

      {loading && <LoadingState message="Searching venues…" />}

      {!loading && error && (
        <p className="section-subtitle" style={{ color: ERROR_COLOR }}>
          {formatError(error, 'There was a problem searching venues.')}
        </p>
      )}

      {!loading && !error && results.length === 0 && (
        <EmptyState message="No venues found from the web for this search." />
      )}

      {!loading && !error && results.length > 0 && (
        <ul className="venue-list">
          {results.map((v) => {
            const key = makeVenueKey(v.name, v.city);
            const nameOnlyKey = makeNameOnlyKey(v.name);
            const strippedKey = makeNameWithoutCityKey(v.name, v.city);
            const existingId =
              existingVenueLookup[key] ??
              existingVenueLookup[nameOnlyKey] ??
              existingVenueLookup[strippedKey];

            return (
              <li key={v.id} style={{ marginBottom: '0.5rem' }}>
                {existingId ? (
                  <Link
                    href={buildVenuePath({ id: existingId, name: v.name, city: v.city })}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="card venue-card" style={{ cursor: 'pointer' }}>
                      <div className="venue-card-main">
                        <div className="venue-name">{v.name}</div>
                        <div className="venue-city">
                          {[v.city, v.country].filter(Boolean).join(', ')}
                        </div>
                        {v.address && (
                          <div
                            className="venue-header-address"
                            style={{ marginTop: '0.1rem' }}
                          >
                            {v.address}
                          </div>
                        )}
                      </div>

                      <div className="venue-score" style={{ textAlign: 'right' }}>
                        <span
                          className="btn btn--primary"
                          style={{
                            fontSize: '0.75rem',
                            paddingInline: '0.75rem',
                            background: `linear-gradient(135deg, ${SUCCESS_COLOR_START}, ${SUCCESS_COLOR_END})`,
                            display: 'inline-block',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          View report card
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div 
                    className="card venue-card" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => !creatingVenue && onSelectVenue(v)}
                  >
                    <div className="venue-card-main">
                      <div className="venue-name">{v.name}</div>
                      <div className="venue-city">
                        {[v.city, v.country].filter(Boolean).join(', ')}
                      </div>
                      {v.address && (
                        <div
                          className="venue-header-address"
                          style={{ marginTop: '0.1rem' }}
                        >
                          {v.address}
                        </div>
                      )}
                    </div>

                    <div className="venue-score" style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVenue(v);
                        }}
                        disabled={creatingVenue}
                        style={{ fontSize: '0.75rem', paddingInline: '0.75rem', opacity: creatingVenue ? 0.6 : 1 }}
                      >
                        {creatingVenue ? 'Creating...' : 'Be the first to grade it'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
