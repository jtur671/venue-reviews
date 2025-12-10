'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { VenueFilters } from '@/components/VenueFilters';
import { AddVenueForm } from '@/components/AddVenueForm';
import { VenueList } from '@/components/VenueList';
import { RemoteSearchResults } from '@/components/RemoteSearchResults';
import { RecentlyRatedSection } from '@/components/RecentlyRatedSection';
import { DraftVenue, RemoteVenue } from '@/types/venues';
import { useVenues } from '@/hooks/useVenues';
import { useVenueStats } from '@/hooks/useVenueStats';
import { useRemoteSearch } from '@/hooks/useRemoteSearch';

type FeaturedVenue = {
  id: string;
  name: string;
  city: string;
  imageUrl: string;
  grade: string; // e.g. "B+"
  score: string; // "7.8/10"
};

const FEATURED_VENUES: FeaturedVenue[] = [
  {
    id: 'factory-town',
    name: 'Factory Town',
    city: 'Miami, FL',
    imageUrl:
      'https://images.unsplash.com/photo-1571266028243-3716f01c7b4e?auto=format&fit=crop&w=1200&q=80',
    grade: 'B+',
    score: '7.8/10',
  },
  {
    id: 'bowery-ballroom',
    name: 'Bowery Ballroom',
    city: 'New York, NY',
    imageUrl:
      'https://images.unsplash.com/photo-1512427691650-1e0c2f9a81b3?auto=format&fit=crop&w=1200&q=80',
    grade: 'A-',
    score: '8.6/10',
  },
  {
    id: 'crooked-thumb',
    name: 'Crooked Thumb Brewery',
    city: 'Safety Harbor, FL',
    imageUrl:
      'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=80',
    grade: 'B',
    score: '8.0/10',
  },
];

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

  function scrollToSearch() {
    const searchSection = document.getElementById('search-section');
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <main className="bg-slate-50 overflow-x-hidden">
      <div className="mx-auto w-full max-w-6xl px-0">
        {/* Section 1: Hero carousel with venue cards + grades */}
        <section className="snap-start min-h-screen md:h-screen flex flex-col justify-start md:justify-center px-4 pt-4 md:pt-0 pb-8 md:pb-0 overflow-x-hidden w-full max-w-full">
          <div className="mb-4 md:mb-6 w-full">
            <p className="text-xs font-medium tracking-wide text-sky-600 uppercase mb-1 md:mb-0.5">
              Live room report cards
            </p>
            <h1 className="text-2xl md:text-4xl font-semibold text-slate-900 mb-2 md:mb-1 break-words">
              Find the right room for your next show.
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-full md:max-w-2xl mb-3 md:mb-2 break-words">
              See real-world grades from artists and fans before you book. Sound,
              vibe, layout, and how the room actually treats you.
            </p>
            {/* Search Now CTA Button */}
            <div className="flex justify-center mb-4 md:mb-6">
              <button
                onClick={scrollToSearch}
                className="inline-flex items-center gap-2 px-5 py-2.5 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm md:text-lg rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <span>🔍</span>
                <span>Search Now</span>
                <span>↓</span>
              </button>
            </div>
          </div>

          {/* Carousel */}
          <div className="relative">
            <div className="flex gap-4 md:gap-8 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:snap-none">
              {FEATURED_VENUES.map((v) => (
                <article
                  key={v.id}
                  className="relative flex-shrink-0 w-[85vw] max-w-[420px] md:w-auto snap-center rounded-2xl md:rounded-3xl bg-slate-900 text-slate-50 shadow-2xl shadow-slate-900/50 overflow-hidden transform transition-transform hover:scale-[1.02]"
                >
                  <div className="relative h-64 md:h-96">
                    <img
                      src={v.imageUrl}
                      alt={v.name}
                      className="h-full w-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                    
                    {/* Large Grade Badge - Top Right */}
                    <div className="absolute top-3 right-3 md:top-5 md:right-5">
                      <div className="flex flex-col items-end gap-1.5 md:gap-2">
                        <div className="inline-flex items-center justify-center rounded-xl md:rounded-2xl bg-white/95 backdrop-blur-sm px-3 py-2 md:px-5 md:py-4 shadow-2xl border-2 border-amber-400/30">
                          <span className="text-[10px] md:text-xs font-semibold text-slate-600 uppercase tracking-wider mr-2 md:mr-3">
                            Grade
                          </span>
                          <span className="text-3xl md:text-6xl font-black text-amber-500 leading-none">
                            {v.grade}
                          </span>
                        </div>
                        <span className="text-xs md:text-sm font-semibold text-slate-100 bg-black/50 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 rounded-lg">
                          {v.score} overall
                        </span>
                      </div>
                    </div>

                    {/* Venue Info - Bottom Left */}
                    <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5">
                      <h2 className="text-lg md:text-3xl font-bold mb-1 md:mb-2 drop-shadow-lg">{v.name}</h2>
                      <p className="text-sm md:text-lg text-slate-200 font-semibold">{v.city}</p>
                    </div>
                  </div>

                  <div className="p-4 md:p-7 text-sm md:text-base border-t border-white/10 bg-slate-900/95">
                    <p className="text-slate-200 leading-relaxed">
                      <span className="font-bold text-slate-50 text-base md:text-lg">Sound, vibe, layout, fairness.</span>{' '}
                      A single grade from artist and fan report cards.
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: "How it works" narrative */}
        <section className="snap-start min-h-screen md:h-screen flex flex-col justify-start md:justify-center px-4 py-8 md:py-0">
          <div className="w-full max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6 md:mb-12 text-center w-full">
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-2 md:mb-3 break-words">
                How it works
              </h2>
              <p className="text-sm md:text-lg text-slate-600 max-w-full md:max-w-2xl mx-auto break-words px-2">
                Find the right room for your next show in three simple steps.
              </p>
            </div>

            {/* Large Step Cards */}
            <div className="grid gap-4 md:gap-8 grid-cols-1 md:grid-cols-3 mb-6 md:mb-12">
              {/* Step 1 */}
              <div className="group relative bg-white rounded-xl md:rounded-2xl border-2 border-slate-200 p-5 md:p-8 shadow-lg hover:shadow-2xl hover:border-blue-400 transition-all duration-300 hover:-translate-y-1">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3 md:mb-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl md:text-5xl font-black text-white">1</span>
                    </div>
                    <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 text-2xl md:text-4xl">🔍</div>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-1 md:mb-2">
                    Search a venue
                  </h3>
                  <p className="text-sm md:text-base text-slate-600">
                    Find rooms by name or city.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="group relative bg-white rounded-xl md:rounded-2xl border-2 border-slate-200 p-5 md:p-8 shadow-lg hover:shadow-2xl hover:border-purple-400 transition-all duration-300 hover:-translate-y-1">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3 md:mb-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl md:text-5xl font-black text-white">2</span>
                    </div>
                    <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 text-2xl md:text-4xl">📊</div>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-1 md:mb-2">
                    Read the room
                  </h3>
                  <p className="text-sm md:text-base text-slate-600">
                    See scores and notes from artists and fans.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="group relative bg-white rounded-xl md:rounded-2xl border-2 border-slate-200 p-5 md:p-8 shadow-lg hover:shadow-2xl hover:border-amber-400 transition-all duration-300 hover:-translate-y-1">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3 md:mb-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl md:text-5xl font-black text-white">3</span>
                    </div>
                    <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 text-2xl md:text-4xl">✍️</div>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-1 md:mb-2">
                    Leave your report card
                  </h3>
                  <p className="text-sm md:text-base text-slate-600">
                    Drop a new venue or add your take to an existing room.
                  </p>
                </div>
              </div>
            </div>

            {/* What we measure - Larger and more prominent */}
            <div className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50 p-5 md:p-8 shadow-2xl">
              <div className="text-center mb-4 md:mb-6">
                <h3 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">What we measure</h3>
                <p className="text-xs md:text-base text-slate-300">
                  The checklist behind every rating.
                </p>
              </div>
              <div className="grid gap-3 md:gap-6 grid-cols-1 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎚️</span>
                  <div>
                    <span className="font-bold text-base md:text-lg">Sound:</span>
                    <p className="text-sm md:text-base text-slate-300 mt-1">
                      Clarity, volume, and how mixes translate.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎧</span>
                  <div>
                    <span className="font-bold text-base md:text-lg">Vibe:</span>
                    <p className="text-sm md:text-base text-slate-300 mt-1">
                      Crowd energy, staff, and overall feel.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">👀</span>
                  <div>
                    <span className="font-bold text-base md:text-lg">Layout:</span>
                    <p className="text-sm md:text-base text-slate-300 mt-1">
                      Stage, sightlines, green room, and load-in.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⚖️</span>
                  <div>
                    <span className="font-bold text-base md:text-lg">Fairness:</span>
                    <p className="text-sm md:text-base text-slate-300 mt-1">
                      Payout, merch cuts, and how the room treats artists.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Search section */}
        <section id="search-section" className="snap-start min-h-screen md:h-screen flex flex-col justify-start md:justify-center px-4 py-8 md:py-0 overflow-x-hidden w-full">
          <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-100 px-6 py-8 md:px-10 md:py-10 shadow-sm">
          <div className="mb-4 w-full overflow-x-hidden">
            <h2 className="text-lg md:text-xl font-semibold text-slate-900 break-words">
              Start with a search
            </h2>
            <p className="mt-1 text-sm text-slate-600 break-words">
              Type a venue name or city, or pick a popular city to see real-world
              report cards.
            </p>
          </div>

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
              <div className="sort-controls" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
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
              <div ref={addVenueRef}>
                <AddVenueForm onAdded={loadVenues} draftVenue={draftVenue} />
              </div>
            </>
          ) : (
            <div style={{ marginTop: '1rem' }}>
              <RecentlyRatedSection venues={recentlyRated} />
            </div>
          )}
          </div>
        </section>
      </div>
    </main>
  );
}
