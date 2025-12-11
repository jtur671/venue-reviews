/**
 * Cleanup script to remove test data from the database
 * 
 * This script removes:
 * - Venues with names starting with "Test Venue"
 * - Reviews with reviewer_name containing "Test", "Vitest", or "Anonymous Reviewer"
 * - Profiles with display_name containing "Test"
 * 
 * Usage:
 *   npm run cleanup-test-data
 * 
 * Or directly:
 *   npx tsx scripts/cleanup-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup...\n');

  try {
    // 1. Clean up test reviews first (they reference venues and users)
    console.log('📝 Cleaning up test reviews...');
    const { data: testReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, reviewer_name')
      .or('reviewer_name.ilike.%Test%,reviewer_name.ilike.%Vitest%,reviewer_name.ilike.%Anonymous Reviewer%');

    if (reviewsError) {
      console.error('Error fetching test reviews:', reviewsError);
    } else if (testReviews && testReviews.length > 0) {
      const reviewIds = testReviews.map(r => r.id);
      const { error: deleteReviewsError } = await supabase
        .from('reviews')
        .delete()
        .in('id', reviewIds);

      if (deleteReviewsError) {
        console.error('Error deleting test reviews:', deleteReviewsError);
      } else {
        console.log(`   ✓ Deleted ${testReviews.length} test review(s)`);
      }
    } else {
      console.log('   ✓ No test reviews found');
    }

    // 2. Clean up test venues
    console.log('\n🏢 Cleaning up test venues...');
    const { data: testVenues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name')
      .ilike('name', 'Test Venue%');

    if (venuesError) {
      console.error('Error fetching test venues:', venuesError);
    } else if (testVenues && testVenues.length > 0) {
      const venueIds = testVenues.map(v => v.id);
      const { error: deleteVenuesError } = await supabase
        .from('venues')
        .delete()
        .in('id', venueIds);

      if (deleteVenuesError) {
        console.error('Error deleting test venues:', deleteVenuesError);
      } else {
        console.log(`   ✓ Deleted ${testVenues.length} test venue(s)`);
        testVenues.forEach(v => console.log(`     - ${v.name}`));
      }
    } else {
      console.log('   ✓ No test venues found');
    }

    // 3. Clean up test profiles (users)
    console.log('\n👤 Cleaning up test profiles...');
    
    // Fetch all profiles and filter for test patterns
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at');

    if (allProfilesError) {
      console.error('Error fetching profiles:', allProfilesError);
    } else {
      // Filter for test patterns (case-insensitive)
      const testProfiles = (allProfiles || []).filter(p => {
        const displayName = (p.display_name || '').toLowerCase();
        return displayName.includes('test') || 
               displayName === 'test user' ||
               displayName.startsWith('test');
      });

      if (testProfiles.length > 0) {
        const profileIds = testProfiles.map(p => p.id);
        const { error: deleteProfilesError } = await supabase
          .from('profiles')
          .delete()
          .in('id', profileIds);

        if (deleteProfilesError) {
          console.error('Error deleting test profiles:', deleteProfilesError);
        } else {
          console.log(`   ✓ Deleted ${testProfiles.length} test profile(s)`);
          testProfiles.forEach(p => {
            const name = p.display_name || 'No name';
            const role = p.role || 'no role';
            const id = p.id.substring(0, 8);
            console.log(`     - ${name} (${role}) - ${id}...`);
          });
        }
      } else {
        console.log('   ✓ No test profiles found');
      }
    }

    console.log('\n✨ Cleanup complete!');
  } catch (error) {
    console.error('Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupTestData();
