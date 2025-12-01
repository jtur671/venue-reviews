'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    async function loadVenues() {
      // Grab venues + their reviews (only need score)
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, city, reviews(score)') // uses FK venue_id → venues.id
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

    loadVenues();
  }, []);

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Venues</h1>

      {loading && (
        <p className="text-sm text-neutral-500">Loading venues…</p>
      )}

      {!loading && venues.length === 0 && (
        <p className="text-sm text-neutral-500">
          No venues yet. Add one in Supabase.
        </p>
      )}

      {!loading && venues.length > 0 && (
        <ul className="space-y-2">
          {venues.map((v) => (
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
