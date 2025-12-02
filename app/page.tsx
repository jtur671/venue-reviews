'use client';

import { useEffect, useState, useMemo, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Venue = {
  id: string;
  name: string;
  city: string;
};

type VenueWithStats = Venue & {
  avgScore: number | null;
  reviewCount: number;
};

export default function HomePage() {
  const [venues, setVenues] = useState<VenueWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');

  // add-venue form state
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('USA');
  const [newAddress, setNewAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function loadVenues() {
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

    const withStats: VenueWithStats[] = (data || []).map((v: any) => {
      const reviews = v.reviews || [];
      const reviewCount = reviews.length;
      const avgScore =
        reviewCount > 0
          ? reviews.reduce(
              (sum: number, r: { score: number }) => sum + r.score,
              0
            ) / reviewCount
          : null;

      return {
        id: v.id,
        name: v.name,
        city: v.city,
        avgScore,
        reviewCount,
      };
    });

    setVenues(withStats);
    setLoading(false);
  }

  useEffect(() => {
    loadVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cities = useMemo(() => {
    const set = new Set<string>();
    venues.forEach((v) => v.city && set.add(v.city));
    return Array.from(set).sort();
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

  async function handleAddVenue(e: FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!newName.trim() || !newCity.trim()) {
      setAddError('Name and city are required.');
      return;
    }

    setAdding(true);

    const { error } = await supabase.from('venues').insert({
      name: newName.trim(),
      city: newCity.trim(),
      country: newCountry.trim() || 'USA',
      address: newAddress.trim() || null,
    });

    if (error) {
      console.error('Error adding venue:', error);
      setAddError('Could not add venue. Please try again.');
      setAdding(false);
      return;
    }

    setNewName('');
    setNewCity('');
    setNewCountry('USA');
    setNewAddress('');

    await loadVenues();
    setAdding(false);
  }

  return (
    <div className="page-container">
      {/* Intro */}
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Find your next favorite room.</h1>
          <p className="section-subtitle">
            Not all venues are built the same. See where the sound, vibe, and
            crowd actually deliver.
          </p>
        </div>
      </section>

      {/* City chips + search */}
      <section className="section card--soft" style={{ padding: '0.85rem 1rem' }}>
        <div className="section-header" style={{ marginBottom: '0.6rem' }}>
          <p className="section-subtitle">Filter</p>
        </div>

        {cities.length > 0 && (
          <div className="chip-row" style={{ marginBottom: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setSelectedCity('All')}
              className={'chip ' + (selectedCity === 'All' ? 'chip--active' : '')}
            >
              All cities
            </button>
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by venue or city…"
          className="input"
        />
      </section>

      {/* Add venue */}
      <section className="section card">
        <div className="section-header">
          <h2 className="section-title">Add a venue</h2>
          <p className="section-subtitle">
            Know a great room that&apos;s missing? Add it so you and your crew
            can rate it.
          </p>
        </div>

        <form onSubmit={handleAddVenue} className="section" style={{ marginBottom: 0 }}>
          <div style={{ marginBottom: '0.6rem' }}>
            <label className="section-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>
              Name*
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Bad Bird Bar"
              className="input"
              required
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 0.9fr',
              gap: '0.5rem',
              marginBottom: '0.6rem',
            }}
          >
            <div>
              <label className="section-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>
                City*
              </label>
              <input
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="Miami"
                className="input"
                required
              />
            </div>
            <div>
              <label className="section-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>
                Country
              </label>
              <input
                type="text"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.6rem' }}>
            <label className="section-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>
              Address (optional)
            </label>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="123 Main St"
              className="input"
            />
          </div>

          {addError && (
            <p style={{ fontSize: '0.75rem', color: '#f97373', marginBottom: '0.4rem' }}>
              {addError}
            </p>
          )}

          <button
            type="submit"
            disabled={adding}
            className="btn btn--primary"
            style={{ width: '100%' }}
          >
            {adding ? 'Adding…' : 'Add venue'}
          </button>
        </form>
      </section>

      {/* Venue list */}
      <section className="section">
        {loading && <p className="section-subtitle">Loading venues…</p>}

        {!loading && filteredVenues.length === 0 && (
          <p className="section-subtitle">
            No venues match your filters yet. Try a different search or add one
            above.
          </p>
        )}

        {!loading && filteredVenues.length > 0 && (
          <ul className="venue-list">
            {filteredVenues.map((v) => (
              <li key={v.id} style={{ marginBottom: '0.6rem' }}>
                <Link href={`/venues/${v.id}`} className="card venue-card">
                  <div className="venue-card-main">
                    <div className="venue-name">{v.name}</div>
                    <div className="venue-city">{v.city}</div>
                  </div>
                  <div className="venue-score">
                    {v.avgScore !== null ? (
                      <>
                        <div className="venue-score-main">
                          {v.avgScore.toFixed(1)}/10
                        </div>
                        <div className="venue-score-sub">
                          {v.reviewCount} review
                          {v.reviewCount === 1 ? '' : 's'}
                        </div>
                      </>
                    ) : (
                      <div className="venue-score-sub">No ratings yet</div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
