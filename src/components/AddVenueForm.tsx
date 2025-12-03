'use client';

import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type DraftVenue = {
  name?: string;
  city?: string;
  country?: string;
  address?: string;
} | null;

type AddVenueFormProps = {
  onAdded: () => void;
  draftVenue?: DraftVenue;
};

export function AddVenueForm({ onAdded, draftVenue }: AddVenueFormProps) {
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('USA');
  const [newAddress, setNewAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!draftVenue) return;

    setNewName(draftVenue.name ?? '');
    setNewCity(draftVenue.city ?? '');
    setNewCountry(draftVenue.country ?? 'USA');
    setNewAddress(draftVenue.address ?? '');
    setShowAddForm(true);
  }, [draftVenue]);

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
    setAdding(false);
    onAdded();
  }

  return (
    <section className="section card">
      <div
        className="section-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: showAddForm ? '0.75rem' : 0,
        }}
      >
        <div>
          <h2 className="section-title">Add a venue</h2>
          <p className="section-subtitle">
            Help the community by adding rooms that deserve a proper report card.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="btn btn--ghost"
        >
          {showAddForm ? 'Close' : "Can’t find your venue? Add it"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddVenue}
          className="section"
          style={{ marginBottom: 0 }}
        >
          <div style={{ marginBottom: '0.6rem' }}>
            <label
              className="section-subtitle"
              style={{ display: 'block', marginBottom: '0.25rem' }}
            >
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
              <label
                className="section-subtitle"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
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
              <label
                className="section-subtitle"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
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
            <label
              className="section-subtitle"
              style={{ display: 'block', marginBottom: '0.25rem' }}
            >
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
            <p
              style={{
                fontSize: '0.75rem',
                color: '#f97373',
                marginBottom: '0.4rem',
              }}
            >
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
      )}
    </section>
  );
}
