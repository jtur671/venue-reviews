'use client';

import { useMemo, useRef, useState } from 'react';
import { VenueFilters } from '@/components/VenueFilters';
import { AddVenueForm } from '@/components/AddVenueForm';
import { VenueList } from '@/components/VenueList';
import { RemoteSearchResults } from '@/components/RemoteSearchResults';
import { HomeHero } from '@/components/HomeHero';
import { RecentlyRatedSection } from '@/components/RecentlyRatedSection';
import { DraftVenue, RemoteVenue } from '@/types/venues';
import { useVenues } from '@/hooks/useVenues';
import { useVenueStats } from '@/hooks/useVenueStats';
import { useRemoteSearch } from '@/hooks/useRemoteSearch';

type SortBy = 'top-rated' | 'most-reviewed' | 'name';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortBy>('top-rated');
  const [draftVenue, setDraftVenue] = useState<DraftVenue>(null);
  const addVenueRef = useRef<HTMLDivElement | null>(null);

  const { venues, loading, refetch: loadVenues } = useVenues();
  const { popularCityStats, popularCities, recentlyRated, existingVenueLookup } = useVenueStats(venues);
  const { remoteResults, remoteLoading, remoteError, hasQuery } = useRemoteSearch(search, selectedCity);

  const filteredVenues = useMemo(() => {
    let list = venues;

    if (selectedCity !== 'All') {
      list = list.filter((v) => v.city === selectedCity);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.city.toLowerCase().includes(q)
      );
    }

    // sort
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'top-rated') {
        const aScore = a.avgScore ?? 0;
        const bScore = b.avgScore ?? 0;
        if (bScore !== aScore) return bScore - aScore;
        // tie-breaker: more reviews wins
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      }

      if (sortBy === 'most-reviewed') {
        const aCount = a.reviewCount ?? 0;
        const bCount = b.reviewCount ?? 0;
        if (bCount !== aCount) return bCount - aCount;
        // tie-breaker: better score wins
        const aScore = a.avgScore ?? 0;
        const bScore = b.avgScore ?? 0;
        return bScore - aScore;
      }

      // 'name' A–Z
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [search, venues, selectedCity, sortBy]);

  const resultLabel = useMemo(() => {
    if (!hasQuery) return undefined;

    if (selectedCity !== 'All' && search.trim()) {
      return `in ${selectedCity} matching "${search.trim()}"`;
    }

    if (selectedCity !== 'All') {
      return `in ${selectedCity}`;
    }

    if (search.trim()) {
      return `matching "${search.trim()}"`;
    }

    return undefined;
  }, [hasQuery, selectedCity, search]);

  const communityLabel = useMemo(() => {
    if (!hasQuery) return undefined;
    if (resultLabel) return `${resultLabel} (community ratings)`;
    return 'community ratings';
  }, [hasQuery, resultLabel]);

  function handleExampleCity(city: string) {
    setSearch('');
    setSelectedCity(city);
  }

  function handleSelectRemoteVenue(v: RemoteVenue) {
    setDraftVenue({
      name: v.name,
      city: v.city,
      country: v.country,
      address: v.address,
    });
    addVenueRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="page-container">
      <HomeHero />

      <section className="section">
        <div className="card hero-card">
          <VenueFilters
            cities={popularCities}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            search={search}
            onSearchChange={setSearch}
            popularCityStats={popularCityStats}
            onPopularCityClick={handleExampleCity}
            searchDisabled={selectedCity !== 'All'}
          />

          {hasQuery ? (
            <>
              <div className="sort-controls">
                <div className="chip-row" role="group" aria-label="Sort venues">
                  <button
                    type="button"
                    className={`chip ${sortBy === 'top-rated' ? 'chip--active' : ''}`}
                    onClick={() => setSortBy('top-rated')}
                    aria-pressed={sortBy === 'top-rated'}
                  >
                    Top rated
                  </button>
                  <button
                    type="button"
                    className={`chip ${sortBy === 'most-reviewed' ? 'chip--active' : ''}`}
                    onClick={() => setSortBy('most-reviewed')}
                    aria-pressed={sortBy === 'most-reviewed'}
                  >
                    Most reviewed
                  </button>
                  <button
                    type="button"
                    className={`chip ${sortBy === 'name' ? 'chip--active' : ''}`}
                    onClick={() => setSortBy('name')}
                    aria-pressed={sortBy === 'name'}
                  >
                    A–Z
                  </button>
                </div>
              </div>
              <VenueList venues={filteredVenues} loading={loading} label={communityLabel} />
              <RemoteSearchResults
                results={remoteResults}
                loading={remoteLoading}
                error={remoteError}
                hasQuery={hasQuery}
                onSelectVenue={handleSelectRemoteVenue}
                existingVenueLookup={existingVenueLookup}
              />
            </>
          ) : null}
        </div>
      </section>

      {!hasQuery && <RecentlyRatedSection venues={recentlyRated} />}


      {hasQuery && (
        <div ref={addVenueRef}>
          <AddVenueForm onAdded={loadVenues} draftVenue={draftVenue} />
        </div>
      )}
    </div>
  );
}
