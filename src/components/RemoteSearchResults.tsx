export type RemoteVenue = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
};

type RemoteSearchResultsProps = {
  results: RemoteVenue[];
  loading: boolean;
  error?: string | null;
  hasQuery: boolean;
  onSelectVenue: (venue: RemoteVenue) => void;
};

export function RemoteSearchResults({
  results,
  loading,
  error,
  hasQuery,
  onSelectVenue,
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

      {loading && <p className="section-subtitle">Searching venues…</p>}

      {!loading && error && (
        <p className="section-subtitle" style={{ color: '#f97373' }}>
          {error}
        </p>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="section-subtitle">
          No venues found from the web for this search.
        </p>
      )}

      {!loading && !error && results.length > 0 && (
        <ul className="venue-list">
          {results.map((v) => (
            <li key={v.id} style={{ marginBottom: '0.5rem' }}>
              <div className="card venue-card">
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
                  <div className="venue-score-sub" style={{ marginBottom: '0.25rem' }}>
                    No report card yet
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => onSelectVenue(v)}
                    style={{ fontSize: '0.75rem', paddingInline: '0.75rem' }}
                  >
                    Create report card
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
