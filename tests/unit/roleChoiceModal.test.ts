import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/lib/supabaseClient';

/**
 * Mission Critical Test: RoleChoiceModal Immutability
 * 
 * This test verifies that the role immutability logic in RoleChoiceModal
 * works correctly - roles can only be set when null, and cannot be changed once set.
 */
describe('RoleChoiceModal Immutability (Mission Critical)', () => {
  let testUserId: string | null = null;
  let isRateLimited = false;

  beforeAll(async () => {
    // Create an anonymous user session for testing
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError || !authData.user) {
      if (authError?.message?.includes('rate limit')) {
        isRateLimited = true;
        console.warn('⚠️  Skipping role choice modal tests due to Supabase rate limit.');
        return;
      }
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }
    testUserId = authData.user.id;
  });

  afterAll(async () => {
    if (isRateLimited || !testUserId) {
      return;
    }

    // Clean up: Delete test profile
    await supabase.from('profiles').delete().eq('id', testUserId);

    // Sign out
    await supabase.auth.signOut();
  });

  it('allows setting role when profile role is null', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Ensure profile exists with null role
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        display_name: 'Test User',
        role: null,
      });

    if (upsertError && upsertError.code !== '23505') {
      throw new Error(`Failed to create profile: ${upsertError.message}`);
    }

    // Reset role to null if it was set
    await supabase
      .from('profiles')
      .update({ role: null })
      .eq('id', testUserId);

    // Try to set role using the immutability-safe update (same logic as RoleChoiceModal)
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'artist' })
      .eq('id', testUserId)
      .is('role', null) // Only update if role is null (immutability constraint)
      .select('role')
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.role).toBe('artist');

    // Verify in database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testUserId)
      .single();

    expect(profile?.role).toBe('artist');
  });

  it('prevents changing role when role is already set (immutability)', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Set role to 'artist' first
    await supabase
      .from('profiles')
      .update({ role: 'artist' })
      .eq('id', testUserId);

    // Verify role is set
    const { data: beforeUpdate } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testUserId)
      .single();

    expect(beforeUpdate?.role).toBe('artist');

    // Try to change role to 'fan' using the immutability-safe update
    // This should fail because role is not null
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'fan' })
      .eq('id', testUserId)
      .is('role', null) // Only update if role is null (immutability constraint)
      .select('role')
      .single();

    // Should return null/error because role is not null (immutability enforced)
    expect(updateData).toBeNull();
    expect(updateError).toBeTruthy();

    // Verify role is still 'artist' (unchanged)
    const { data: afterUpdate } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testUserId)
      .single();

    expect(afterUpdate?.role).toBe('artist'); // Role should remain unchanged
  });

  it('allows setting role to fan when null', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Reset role to null
    await supabase
      .from('profiles')
      .update({ role: null })
      .eq('id', testUserId);

    // Set role to 'fan' using the immutability-safe update
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'fan' })
      .eq('id', testUserId)
      .is('role', null) // Only update if role is null (immutability constraint)
      .select('role')
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.role).toBe('fan');

    // Verify in database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testUserId)
      .single();

    expect(profile?.role).toBe('fan');
  });

  it('prevents setting role when already set to fan', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Ensure role is 'fan'
    await supabase
      .from('profiles')
      .update({ role: 'fan' })
      .eq('id', testUserId);

    // Try to change to 'artist' - should fail
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'artist' })
      .eq('id', testUserId)
      .is('role', null) // Only update if role is null (immutability constraint)
      .select('role')
      .single();

    expect(updateData).toBeNull();
    expect(updateError).toBeTruthy();

    // Verify role is still 'fan'
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testUserId)
      .single();

    expect(profile?.role).toBe('fan');
  });

  it('verifies that .is("role", null) constraint works correctly', async () => {
    if (isRateLimited || !testUserId) {
      return; // Skip if rate limited
    }

    // Test 1: Update with .is('role', null) when role IS null - should succeed
    await supabase
      .from('profiles')
      .update({ role: null })
      .eq('id', testUserId);

    const { data: data1, error: error1 } = await supabase
      .from('profiles')
      .update({ role: 'artist' })
      .eq('id', testUserId)
      .is('role', null)
      .select('role')
      .single();

    expect(error1).toBeNull();
    expect(data1?.role).toBe('artist');

    // Test 2: Update with .is('role', null) when role IS NOT null - should fail
    const { data: data2, error: error2 } = await supabase
      .from('profiles')
      .update({ role: 'fan' })
      .eq('id', testUserId)
      .is('role', null) // This should prevent update since role is 'artist'
      .select('role')
      .single();

    expect(data2).toBeNull();
    expect(error2).toBeTruthy();

    // Verify role is still 'artist'
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testUserId)
      .single();

    expect(profile?.role).toBe('artist');
  });
});
