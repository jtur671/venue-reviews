'use client';

import { useRef, useEffect } from 'react';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find the main scroll container
    mainRef.current = document.querySelector('.app-main') as HTMLElement;
  }, []);

  const handleFocus = () => {
    if (!mainRef.current || typeof window === 'undefined') return;
    
    // Temporarily disable scroll snapping when input is focused
    mainRef.current.style.scrollSnapType = 'none';
    
    // Ensure input stays visible
    if (inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
    }
  };

  const handleBlur = () => {
    if (!mainRef.current) return;
    
    // Re-enable scroll snapping after a short delay
    setTimeout(() => {
      if (mainRef.current) {
        mainRef.current.style.scrollSnapType = 'y mandatory';
      }
    }, 100);
  };

  return (
    <div className="w-full overflow-x-hidden">
      {/* Search input - always visible */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden', marginBottom: '0.75rem' }}>
        <span
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1rem',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 10,
          }}
        />
      </div>

      {/* City filters - only show if cities available */}
      {cities.length > 0 && (
        <>
          <div className="section-header" style={{ marginBottom: '0.5rem' }}>
            <p className="section-subtitle">Recently rated</p>
          </div>
          <div className="chip-row" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
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
        </>
      )}

      {popularCityStats && popularCityStats.length > 0 && onPopularCityClick && (
        <div className="section" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          <div className="section-header" style={{ marginBottom: '0.4rem' }}>
            <h3 className="section-title" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Popular cities
            </h3>
          </div>
          <div className="chip-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
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
