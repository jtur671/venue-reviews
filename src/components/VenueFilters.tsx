type VenueFiltersProps = {
  cities: string[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
};

export function VenueFilters({
  cities,
  selectedCity,
  onCityChange,
  search,
  onSearchChange,
}: VenueFiltersProps) {
  return (
    <section
      className="section card--soft"
      style={{ padding: '0.85rem 1rem' }}
    >
      <div className="section-header" style={{ marginBottom: '0.6rem' }}>
        <p className="section-subtitle">Filter</p>
      </div>

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

      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by venue or city…"
        className="input"
      />
    </section>
  );
}
