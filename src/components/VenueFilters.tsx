type VenueFiltersProps = {
  cities: string[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  popularCityStats?: Array<{ city: string; reviewCount: number }>;
  onPopularCityClick?: (city: string) => void;
  searchDisabled?: boolean;
};

export function VenueFilters({
  cities,
  selectedCity,
  onCityChange,
  search,
  onSearchChange,
  popularCityStats,
  onPopularCityClick,
  searchDisabled = false,
}: VenueFiltersProps) {
  return (
    <div>
      {cities.length > 0 && (
        <div className="section-header" style={{ marginBottom: '0.6rem' }}>
          <p className="section-subtitle">Recently rated</p>
        </div>
      )}

      {cities.length > 0 && (
        <div className="chip-row" style={{ marginBottom: '0.65rem' }}>
          <button
            type="button"
            onClick={() => onCityChange('All')}
            className={'chip ' + (selectedCity === 'All' ? 'chip--active' : '')}
          >
            None
          </button>
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => onCityChange(city)}
              className={'chip ' + (selectedCity === city ? 'chip--active' : '')}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1rem',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Type a venue name (like Bowery Ballroom) or tap a city to see how the room really feels."
          className="input"
          disabled={searchDisabled}
          aria-label={searchDisabled ? 'Search disabled - city filter is active' : 'Search venues by name or city'}
          aria-disabled={searchDisabled}
          style={{
            paddingLeft: '2.5rem',
            height: '2.75rem',
            fontSize: '0.95rem',
            opacity: searchDisabled ? 0.6 : 1,
            cursor: searchDisabled ? 'not-allowed' : 'text',
          }}
        />
      </div>

      {popularCityStats && popularCityStats.length > 0 && onPopularCityClick && (
        <div className="section" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          <div className="section-header" style={{ marginBottom: '0.4rem' }}>
            <h3 className="section-title" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Popular cities
            </h3>
          </div>
          <div className="chip-row">
            {popularCityStats.map((c) => (
              <button
                key={c.city}
                type="button"
                className="chip"
                onClick={() => onPopularCityClick(c.city)}
              >
                {c.city}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
