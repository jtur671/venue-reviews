'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { VenueFilters } from '@/components/VenueFilters';
import { AddVenueForm } from '@/components/AddVenueForm';
import { VenueList } from '@/components/VenueList';
import { RemoteSearchResults } from '@/components/RemoteSearchResults';
import { StarRating } from '@/components/StarRating';
import { RatingIcons } from '@/components/RatingIcons';
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
      .select('id, name, city, reviews(score, created_at)')
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

  const popularCityStats = useMemo(() => {
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
      .map(([city, stats]) => ({ city, ...stats }));
  }, [venues]);

  const popularCities = useMemo(() => popularCityStats.map((c) => c.city), [popularCityStats]);

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

  const recentlyRated = useMemo(() => {
    return [...venues]
      .filter((v) => !!v.latestReviewAt)
      .sort((a, b) => {
        const aTime = a.latestReviewAt ? new Date(a.latestReviewAt).getTime() : 0;
        const bTime = b.latestReviewAt ? new Date(b.latestReviewAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [venues]);

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

  const howItWorks = [
    { title: '1️⃣ Search a venue', detail: 'Find rooms by name or city.' },
    { title: '2️⃣ Read the room', detail: 'Scores + reviews from artists and fans.' },
    { title: '3️⃣ Leave your report card', detail: 'Drop a venue or add your take.' },
  ];

  const whatWeMeasure = [
    'Sound: clarity, volume, and how mixes translate.',
    'Vibe: crowd energy, staff, and overall feel.',
    'Layout: stage, sightlines, green room, and load-in.',
    'Fairness: payout, merch cuts, and how the room treats artists.',
  ];

  function formatDateShort(dateString?: string | null) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

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
        <div className="card" style={{ padding: '1.25rem 1.35rem' }}>
          <div className="section-header">
            <h1 className="section-title" style={{ fontSize: '1.6rem' }}>
              Find the right room for your next show.
            </h1>
            <p className="section-subtitle" style={{ marginTop: '0.35rem' }}>
              Search live music venues by how they actually feel for artists and fans.
            </p>
          </div>
          <div
            id="how-it-works"
            className="section"
            style={{
              display: 'grid',
              gap: '0.75rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              marginTop: '1rem',
              marginBottom: 0,
            }}
          >
            {howItWorks.map((step) => (
              <div
                key={step.title}
                style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <div className="section-title" style={{ fontSize: '0.95rem', marginBottom: '0.2rem', fontWeight: 600 }}>
                  {step.title}
                </div>
                <div className="section-subtitle" style={{ margin: 0, fontSize: '0.8rem' }}>{step.detail}</div>
              </div>
            ))}
          </div>

          <div className="section" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
            <div className="section-header" style={{ marginBottom: '0.4rem' }}>
              <h2 className="section-title" style={{ fontSize: '1rem' }}>What we measure</h2>
              <p className="section-subtitle" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>The checklist behind every rating.</p>
            </div>
            <ul
              style={{
                paddingLeft: '1rem',
                margin: 0,
                display: 'grid',
                gap: '0.3rem',
              }}
            >
              {whatWeMeasure.map((item) => (
                <li key={item} className="section-subtitle" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div
          className="card"
          style={{
            padding: '1.35rem 1.5rem',
            maxWidth: '680px',
            margin: '0 auto',
            background: 'rgba(37, 99, 235, 0.03)',
            borderColor: 'rgba(37, 99, 235, 0.1)',
          }}
        >
          <VenueFilters
            cities={popularCities}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            search={search}
            onSearchChange={setSearch}
          />

          {(exampleVenue || exampleCities.length > 0) && (
            <div className="section" style={{ marginTop: '-0.5rem', marginBottom: '0.25rem' }}>
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
            </div>
          )}

          {hasQuery ? (
            <>
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
          ) : (
            <section className="section" style={{ marginBottom: 0 }}>
              <p className="section-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Type a venue name (like Bowery Ballroom) or tap a city to see how the room really feels.
              </p>
            </section>
          )}
        </div>
      </section>

      {!hasQuery && (
        <section className="section">
          <div className="card recently-section" style={{ padding: '1.1rem 1.25rem' }}>
            <div className="section-header" style={{ marginBottom: '0.5rem' }}>
              <h2 className="section-title">Recently rated</h2>
              <p className="section-subtitle" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                Fresh report cards from the last week.
              </p>
            </div>
            {recentlyRated.length ? (
              <ul className="venue-list" style={{ margin: 0, padding: 0 }}>
                {recentlyRated.map((v) => (
                  <li key={v.id} style={{ marginBottom: '0.5rem', listStyle: 'none' }}>
                    <Link href={`/venues/${v.id}`} className="card recently-card" style={{ padding: '0.75rem 0.9rem' }}>
                      <div className="recently-main">
                        <div className="recently-name">{v.name}</div>
                        <div className="recently-meta">
                          {v.city} · USA
                        </div>
                        <div className="recently-meta">
                          {v.reviewCount === 1
                            ? '1 review'
                            : `${v.reviewCount} reviews`}{' '}
                          · Community report card
                        </div>
                      </div>
                      <div className="recently-rating">
                        <RatingIcons score={v.avgScore} />
                        <div className="recently-rating-text">
                          {v.avgScore?.toFixed(1) ?? '—'}/10
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-subtitle" style={{ marginBottom: 0 }}>
                Ratings will appear here as the community weighs in.
              </p>
            )}
          </div>
        </section>
      )}

      {!hasQuery && popularCityStats.length > 0 && (
        <section className="section">
          <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
            <div className="section-header" style={{ marginBottom: '0.5rem' }}>
              <h2 className="section-title">Popular cities</h2>
            </div>
            <div className="chip-row">
              {popularCityStats.map((c) => (
                <button
                  key={c.city}
                  type="button"
                  className="chip"
                  onClick={() => handleExampleCity(c.city)}
                >
                  {c.city}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasQuery && (
        <div ref={addVenueRef}>
          <AddVenueForm onAdded={loadVenues} draftVenue={draftVenue} />
        </div>
      )}
    </div>
  );
}
