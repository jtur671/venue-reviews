import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Global setup/teardown for Vitest
 * The returned function runs ONCE after ALL tests complete
 * This ensures any leftover test data is cleaned up
 */
export default async function setup() {
  // Setup logic (none needed)
  
  // Return teardown function that runs after all tests
  return async function teardown() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  Cannot run global teardown: Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    console.log('\n🧹 Running global teardown cleanup...');
    
    // Wait a moment for any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Clean up any test profiles - use same approach as cleanup script
    // Fetch all profiles and filter in JavaScript for reliability
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, display_name, role');
    
    // Filter for test patterns (case-insensitive) - same logic as cleanup script
    const testProfiles = (allProfiles || []).filter(p => {
      const displayName = (p.display_name || '').toLowerCase();
      return displayName.includes('test') || displayName === 'test user';
    });

    if (testProfiles && testProfiles.length > 0) {
      const profileIds = testProfiles.map(p => p.id);
      // Try to delete - if RLS blocks it, that's okay, the cleanup script will handle it
      const { data: deletedData, error } = await supabase
        .from('profiles')
        .delete()
        .in('id', profileIds)
        .select('id');
      
      if (error) {
        // RLS might block this - that's okay, manual cleanup script will handle it
        console.log(`   ⚠️  Could not delete profiles via teardown: ${error.message} (code: ${error.code})`);
        console.log(`   💡 Run 'npm run cleanup-test-data' to clean up manually.`);
      } else {
        const actuallyDeleted = deletedData?.length || 0;
        if (actuallyDeleted > 0) {
          console.log(`   ✓ Removed ${actuallyDeleted} of ${testProfiles.length} test profile(s) in global teardown`);
        } else {
          console.log(`   ⚠️  Delete reported success but 0 profiles were removed (RLS restriction)`);
          console.log(`   💡 Run 'npm run cleanup-test-data' to clean up manually.`);
        }
      }
    } else {
      console.log('   ✓ No test profiles found in global teardown');
    }

    // Clean up any test venues
    const { data: testVenues } = await supabase
      .from('venues')
      .select('id, name')
      .ilike('name', 'Test Venue%');

    if (testVenues && testVenues.length > 0) {
      const venueIds = testVenues.map(v => v.id);
      const { error } = await supabase.from('venues').delete().in('id', venueIds);
      if (!error) {
        console.log(`   ✓ Removed ${testVenues.length} test venue(s) in global teardown`);
      }
    }

    // Clean up any test reviews
    const { data: testReviews } = await supabase
      .from('reviews')
      .select('id, reviewer_name')
      .or('reviewer_name.ilike.%Test%,reviewer_name.ilike.%Vitest%,reviewer_name.ilike.%Anonymous Reviewer%');

    if (testReviews && testReviews.length > 0) {
      const reviewIds = testReviews.map(r => r.id);
      const { error } = await supabase.from('reviews').delete().in('id', reviewIds);
      if (!error) {
        console.log(`   ✓ Removed ${testReviews.length} test review(s) in global teardown`);
      }
    }

    console.log('✨ Global teardown complete!\n');
    console.log('💡 Tip: If test data remains, run "npm run cleanup-test-data" to clean up manually.\n');
  } catch (error) {
    console.warn('⚠️  Global teardown error:', error);
    console.warn('💡 Run "npm run cleanup-test-data" to clean up test data manually.\n');
  }
  };
}
