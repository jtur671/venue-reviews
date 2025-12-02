import { describe, expect, it } from 'vitest';
import { supabase } from '@/lib/supabaseClient';
import { KNOWN_VENUE_ID } from './fixtures';

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

describe('Supabase connection', () => {
  it('has the necessary environment variables configured', () => {
    for (const key of requiredEnvVars) {
      expect(process.env[key], `${key} is required for Supabase tests`).toBeTruthy();
    }
  });

  it('can execute a read-only query against the venues table', async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, city')
      .order('name', { ascending: true })
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data).not.toBeNull();
  });

  it('can load reviews for a known venue id', async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, venue_id, score, created_at')
      .eq('venue_id', KNOWN_VENUE_ID)
      .order('created_at', { ascending: false })
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data).not.toBeNull();
  });

  it('can insert and clean up a review for a known venue', async () => {
    const uniqueComment = `Automated test review ${Date.now()}`;

    const { data: insertData, error: insertError } = await supabase
      .from('reviews')
      .insert({
        venue_id: KNOWN_VENUE_ID,
        reviewer_name: 'Vitest Bot',
        score: 8,
        comment: uniqueComment,
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    expect(insertData?.id).toBeTruthy();

    if (!insertData?.id) {
      throw new Error('Supabase did not return the inserted review id');
    }

    const insertedId = insertData.id;

    const { data: fetchedData, error: fetchError } = await supabase
      .from('reviews')
      .select('id, comment')
      .eq('id', insertedId)
      .single();

    expect(fetchError).toBeNull();
    expect(fetchedData?.comment).toBe(uniqueComment);

    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', insertedId);

    expect(deleteError).toBeNull();
  });

  it('can insert and clean up a venue', async () => {
    const uniqueName = `Vitest Venue ${Date.now()}`;
    const city = 'Test City';

    const { data: insertData, error: insertError } = await supabase
      .from('venues')
      .insert({
        name: uniqueName,
        city,
        country: 'Testland',
        address: '123 Test St',
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    expect(insertData?.id).toBeTruthy();

    if (!insertData?.id) {
      throw new Error('Supabase did not return the inserted venue id');
    }

    const insertedId = insertData.id;

    const { data: fetchedData, error: fetchError } = await supabase
      .from('venues')
      .select('id, name, city')
      .eq('id', insertedId)
      .single();

    expect(fetchError).toBeNull();
    expect(fetchedData?.name).toBe(uniqueName);
    expect(fetchedData?.city).toBe(city);

    const { error: deleteError } = await supabase
      .from('venues')
      .delete()
      .eq('id', insertedId);

    expect(deleteError).toBeNull();
  });
});
