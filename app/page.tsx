'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { VenueFilters } from '@/components/VenueFilters';
import { AddVenueForm } from '@/components/AddVenueForm';
import { VenueList } from '@/components/VenueList';
import { RemoteSearchResults } from '@/components/RemoteSearchResults';
import { mapSupabaseVenues } from '@/lib/mapSupabaseVenues';
import { makeVenueKey, makeNameOnlyKey } from '@/lib/venueKeys';
import { DraftVenue, RemoteVenue, VenueWithStats } from '@/types/venues';
import { useAnonUser } from '@/hooks/useAnonUser';

export default function HomePage() {
  const [venues, setVenues] = useState<VenueWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');

  const [remoteResults, setRemoteResults] = useState<RemoteVenue[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [draftVenue, setDraftVenue] = useState<DraftVenue>(null);
  const addVenueRef = useRef<HTMLDivElement | null>(null);
  const { user, loading: userLoading } = useAnonUser();

  const existingVenueLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    venues.forEach((v) => {
      if (!v.name || !v.city) return;
      const key = makeVenueKey(v.name, v.city);
      lookup[key] = v.id;
      const nameOnlyKey = makeNameOnlyKey(v.name);
      if (!lookup[nameOnlyKey]) {
        lookup[nameOnlyKey] = v.id;
      }
    });
    return lookup;
  }, [venues]);

  const loadVenues = useCallback(async () => {
    if (userLoading || !user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('venues')
      .select('id, name, city, reviews(score)')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading venues:', error);
      setLoading(false);
      return;
    }

    const withStats = mapSupabaseVenues(data || []);
    setVenues(withStats);
    setLoading(false);
  }, [userLoading, user]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const popularCities = useMemo(() => {
    const map = new Map<string, { venueCount: number; reviewCount: number }>();

    venues.forEach((v) => {
      if (!v.city) return;
      const current = map.get(v.city) || { venueCount: 0, reviewCount: 0 };
      current.venueCount += 1;
      current.reviewCount += v.reviewCount;
      map.set(v.city, current);
    });

    return Array.from(map.entries())
      .sort((a, b) => {
        if (b[1].reviewCount !== a[1].reviewCount) {
          return b[1].reviewCount - a[1].reviewCount;
        }
        return b[1].venueCount - a[1].venueCount;
      })
      .slice(0, 6)
      .map(([city]) => city);
  }, [venues]);

  const exampleVenue = useMemo(() => {
    if (!venues.length) return null;
    const sorted = [...venues].sort((a, b) => {
      if (b.reviewCount !== a.reviewCount) {
        return b.reviewCount - a.reviewCount;
      }
      return a.name.localeCompare(b.name);
    });
    return sorted[0];
  }, [venues]);

  const exampleCities = useMemo(
    () => popularCities.slice(0, 3),
    [popularCities]
  );

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

    return list;
  }, [search, venues, selectedCity]);

  const hasQuery = search.trim().length > 0 || selectedCity !== 'All';

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

  useEffect(() => {
    if (!hasQuery || userLoading || !user) {
      setRemoteResults([]);
      setRemoteError(null);
      setRemoteLoading(false);
      return;
    }

    const q = search.trim();
    const city = selectedCity !== 'All' ? selectedCity : '';

    const timeout = setTimeout(async () => {
      if (!q && !city) return;

      setRemoteLoading(true);
      setRemoteError(null);

      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (city) params.set('city', city);

        const res = await fetch(`/api/search-venues?${params.toString()}`);
        if (!res.ok) {
          const text = await res.text();
          console.error('Search API error:', res.status, text);
          setRemoteError('There was a problem searching venues.');
          setRemoteResults([]);
        } else {
          const json = await res.json();
          setRemoteResults(json.results || []);
        }
      } catch (err) {
        console.error('Search request failed:', err);
        setRemoteError('There was a problem searching venues.');
        setRemoteResults([]);
      } finally {
        setRemoteLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [hasQuery, search, selectedCity, userLoading, user]);

  function handleExampleVenue(name: string) {
    setSelectedCity('All');
    setSearch(name);
  }

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
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Search live venues by experience.</h1>
          <p className="section-subtitle">
            Start typing a venue or pick a popular city to see how the room actually feels for artists and fans.
          </p>
        </div>
      </section>

      <VenueFilters
        cities={popularCities}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        search={search}
        onSearchChange={setSearch}
      />

      {(exampleVenue || exampleCities.length > 0) && (
        <section className="section" style={{ marginTop: '-0.5rem' }}>
          <p className="section-subtitle" style={{ marginBottom: '0.35rem' }}>
            Try:
          </p>
          <div className="chip-row">
            {exampleVenue && (
              <button
                type="button"
                className="chip"
                onClick={() => handleExampleVenue(exampleVenue.name)}
              >
                {exampleVenue.name}
                {exampleVenue.city ? ` · ${exampleVenue.city}` : ''}
              </button>
            )}
            {exampleCities.map((city) => (
              <button
                key={city}
                type="button"
                className="chip"
                onClick={() => handleExampleCity(city)}
              >
                {city}
              </button>
            ))}
        </div>
        </section>
      )}

      {hasQuery ? (
        <>
          <VenueList
            venues={filteredVenues}
            loading={loading}
            label={communityLabel}
          />
          <RemoteSearchResults
            results={remoteResults}
            loading={remoteLoading}
            error={remoteError}
            hasQuery={hasQuery}
            onSelectVenue={handleSelectRemoteVenue}
            existingVenueLookup={existingVenueLookup}
          />
        </>
      ) : (
        <section className="section">
          <p className="section-subtitle">
            Start by searching for a venue or tapping a city above to see ratings.
          </p>
        </section>
      )}

      <div ref={addVenueRef}>
        <AddVenueForm onAdded={loadVenues} draftVenue={draftVenue} />
      </div>
    </div>
  );
}
