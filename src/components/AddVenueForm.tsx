'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createVenue } from '@/lib/services/venueService';
import { DraftVenue } from '@/types/venues';
import { ERROR_COLOR } from '@/constants/ui';

type AddVenueFormProps = {
  onAdded: () => void;
  draftVenue?: DraftVenue;
};

export function AddVenueForm({ onAdded, draftVenue }: AddVenueFormProps) {
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('USA');
  const [newAddress, setNewAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [googlePlaceId, setGooglePlaceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!draftVenue) return;

    setTimeout(() => {
      setNewName(draftVenue.name ?? '');
      setNewCity(draftVenue.city ?? '');
      setNewCountry(draftVenue.country ?? 'USA');
      setNewAddress(draftVenue.address ?? '');
      setPhotoUrl(draftVenue.photoUrl ?? null);
      setGooglePlaceId(draftVenue.googlePlaceId);
      setShowAddForm(true);
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [draftVenue]);

  async function handleAddVenue(e: FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!newName.trim() || !newCity.trim()) {
      setAddError('Name and city are required.');
      return;
    }

    setAdding(true);

    const { data, error } = await createVenue({
      name: newName,
      city: newCity,
      country: newCountry,
      address: newAddress || null,
      photo_url: photoUrl,
      google_place_id: googlePlaceId,
    });

    if (error) {
      setAddError(error.message || 'Could not add venue. Please try again.');
      setAdding(false);
      return;
    }

    if (data?.id) {
      router.push(`/venues/${data.id}`);
      return;
    }

    setNewName('');
    setNewCity('');
    setNewCountry('USA');
    setNewAddress('');
    setPhotoUrl(null);
    setGooglePlaceId(undefined);

    setAdding(false);
    onAdded();
  }

  return (
    <section ref={containerRef} className="section" style={{ marginTop: '1.5rem' }}>
      {!showAddForm && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn--primary"
            style={{
              borderRadius: '999px',
              paddingInline: '1.5rem',
              paddingBlock: '0.6rem',
              fontSize: '0.9rem',
            }}
            onClick={() => setShowAddForm(true)}
          >
            Can’t find your venue? Add it
          </button>
        </div>
      )}

      {showAddForm && (
        <div
          className="card"
          style={{ maxWidth: '520px', margin: '0 auto', padding: '0.9rem 1rem' }}
        >
          <div
            className="section-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
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
              className="btn btn--ghost"
              style={{ fontSize: '0.8rem' }}
              onClick={() => setShowAddForm(false)}
            >
              Close
            </button>
          </div>

          <form onSubmit={handleAddVenue} className="section" style={{ marginBottom: 0 }}>
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
                  color: ERROR_COLOR,
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
        </div>
      )}
    </section>
  );
}
