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

  // city filter
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

  // unique cities from venues
  const cities = useMemo(() => {
    const set = new Set<string>();
    venues.forEach((v) => {
      if (v.city) set.add(v.city);
    });
    return Array.from(set).sort();
  }, [venues]);

  // Filter venues by city + search text (name or city)
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

    // clear form
    setNewName('');
    setNewCity('');
    setNewCountry('USA');
    setNewAddress('');

    // reload list (this will also update available cities)
    await loadVenues();
    setAdding(false);
  }

  return (
    <main className="mx-auto max-w-xl p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold mb-1">Venues</h1>
        <p className="text-xs text-neutral-500">
          Search, filter by city, and add live music venues to rate.
        </p>
      </header>

      {/* City filter chips */}
      {cities.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCity('All')}
            className={`rounded-full border px-3 py-1 ${
              selectedCity === 'All'
                ? 'border-neutral-100 text-neutral-100'
                : 'border-neutral-700 text-neutral-400'
            }`}
          >
            All
          </button>
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(city)}
              className={`rounded-full border px-3 py-1 ${
                selectedCity === city
                  ? 'border-neutral-100 text-neutral-100'
                  : 'border-neutral-700 text-neutral-400'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search e.g. Bowery, Tampa, Austin..."
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-2 text-sm"
        />
      </div>

      {/* Add venue form */}
      <section className="rounded-md border border-neutral-800 p-3 space-y-2">
        <h2 className="text-sm font-semibold text-neutral-200">
          Add a venue
        </h2>
        <form onSubmit={handleAddVenue} className="space-y-2">
          <div>
            <label className="block text-xs mb-1">Name*</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Bad Bird Bar"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1">City*</label>
              <input
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="Miami"
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Country</label>
              <input
                type="text"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Address (optional)</label>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm"
            />
          </div>

          {addError && (
            <p className="text-xs text-red-400">{addError}</p>
          )}

          <button
            type="submit"
            disabled={adding}
            className="w-full rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add venue'}
          </button>
        </form>
      </section>

      {/* Venues list */}
      {loading && (
        <p className="text-sm text-neutral-500">Loading venues…</p>
      )}

      {!loading && filteredVenues.length === 0 && (
        <p className="text-sm text-neutral-500">
          No venues match your filters.
        </p>
      )}

      {!loading && filteredVenues.length > 0 && (
        <ul className="space-y-2">
          {filteredVenues.map((v) => (
            <li key={v.id}>
              <Link
                href={`/venues/${v.id}`}
                className="flex items-center justify-between rounded-md border border-neutral-800 p-2"
              >
                <div>
                  <div className="text-sm font-medium">{v.name}</div>
                  <div className="text-xs text-neutral-500">{v.city}</div>
                </div>

                <div className="text-right text-xs">
                  {v.avgScore !== null ? (
                    <>
                      <div className="font-semibold">
                        {v.avgScore.toFixed(1)}/10
                      </div>
                      <div className="text-neutral-500">
                        {v.reviewCount} review
                        {v.reviewCount === 1 ? '' : 's'}
                      </div>
                    </>
                  ) : (
                    <div className="text-neutral-500 text-[11px]">
                      No ratings yet
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
