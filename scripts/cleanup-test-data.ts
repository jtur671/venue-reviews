/**
 * Cleanup script to remove test data from the database
 * 
 * This script removes:
 * - Venues with names starting with "Test Venue"
 * - Reviews with reviewer_name containing "Test", "Vitest", or "Anonymous Reviewer"
 * - Profiles with display_name containing "Test"
 * 
 * IMPORTANT: This script requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * to bypass RLS (Row Level Security) policies. Without it, profile deletion
 * will be blocked by RLS.
 * 
 * To get your service role key:
 * 1. Go to Supabase Dashboard → Project Settings → API
 * 2. Copy the "service_role" key (NOT the anon key)
 * 3. Add it to .env.local as: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
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
// Try service role key first (bypasses RLS), fall back to anon key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL must be set');
  process.exit(1);
}

// Use service role key if available (bypasses RLS), otherwise use anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
if (!supabaseKey) {
  console.error('Error: Either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
if (supabaseServiceKey) {
  console.log('🔑 Using service role key (RLS bypass enabled)\n');
} else {
  console.log('⚠️  Using anon key (may be blocked by RLS)');
  console.log('⚠️  For reliable cleanup, add SUPABASE_SERVICE_ROLE_KEY to .env.local\n');
}

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

    // 3. Clean up test profiles (users) - STRICT MODE
    console.log('\n👤 Cleaning up test profiles...');
    
    // First, let's verify which Supabase project we're connected to
    console.log(`   🔗 Connected to: ${supabaseUrl?.substring(0, 30)}...`);
    
    // Fetch ALL profiles first
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at');

    if (allProfilesError) {
      console.error('   ❌ Error fetching profiles:', allProfilesError);
      console.error('   Details:', JSON.stringify(allProfilesError, null, 2));
    } else {
      console.log(`   📊 Found ${(allProfiles || []).length} total profile(s) in database`);
      
      // STRICT filtering - catch all variations
      const testProfiles = (allProfiles || []).filter(p => {
        const displayName = (p.display_name || '').trim().toLowerCase();
        const exactMatch = displayName === 'test user';
        const containsTest = displayName.includes('test');
        const startsWithTest = displayName.startsWith('test');
        const isTestUser = displayName === 'testuser' || displayName === 'test-user';
        
        // Also check if display_name is null/empty (sometimes test users have no name)
        const hasNoName = !p.display_name || p.display_name.trim() === '';
        
        // Log what we're checking for debugging
        if (exactMatch || containsTest || startsWithTest || isTestUser) {
          console.log(`   🔍 Detected test profile: "${p.display_name}" (id: ${p.id.substring(0, 8)}...)`);
        }
        
        return exactMatch || containsTest || startsWithTest || isTestUser;
      });

      if (testProfiles.length > 0) {
        console.log(`   🎯 Found ${testProfiles.length} test profile(s) to delete:`);
        testProfiles.forEach(p => {
          const name = p.display_name || '(no name)';
          const role = p.role || 'no role';
          const id = p.id.substring(0, 8);
          const createdAt = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : 'unknown';
          console.log(`     - "${name}" (${role}) - ${id}... (created: ${createdAt})`);
        });

        const profileIds = testProfiles.map(p => p.id);
        
        // Try using the cleanup function first (if it exists and RLS is fixed)
        console.log('   🔧 Attempting to use cleanup_test_profiles() function...');
        const { data: functionResult, error: functionError } = await supabase.rpc('cleanup_test_profiles');
        
        if (!functionError && functionResult && functionResult.length > 0) {
          const result = functionResult[0];
          console.log(`   ✅ Cleanup function executed successfully:`);
          console.log(`      - Deleted ${result.deleted_profiles_count || 0} profile(s)`);
          console.log(`      - Deleted ${result.deleted_auth_users_count || 0} auth user(s)`);
          console.log(`      - Deleted ${result.deleted_reviews_count || 0} review(s)`);
          
          // Verify deletion
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: verifyProfiles } = await supabase
            .from('profiles')
            .select('id')
            .in('id', profileIds);
          
          if ((verifyProfiles || []).length === 0) {
            console.log(`   ✅ VERIFICATION PASSED: All profiles deleted via cleanup function`);
            return; // Success, exit early
          } else {
            console.log(`   ⚠️  Function ran but ${(verifyProfiles || []).length} profile(s) still exist, trying direct delete...`);
          }
        } else if (functionError) {
          console.log(`   ⚠️  Cleanup function not available (${functionError.message}), using direct delete...`);
        }
        
        // Fallback: Direct delete (will work if RLS policy is updated)
        const { data: deletedData, error: deleteProfilesError } = await supabase
          .from('profiles')
          .delete()
          .in('id', profileIds)
          .select('id'); // Return deleted IDs for verification

        if (deleteProfilesError) {
          console.error('   ❌ Error deleting test profiles:', deleteProfilesError);
          console.error('   Error details:', JSON.stringify(deleteProfilesError, null, 2));
          console.error('   💡 This might be an RLS restriction. Check your Supabase RLS policies.');
          
          // If we have service role key, try deleting auth users directly
          if (supabaseServiceKey) {
            console.log(`   🔐 Attempting to delete ${testProfiles.length} auth user(s) directly (bypasses profiles table)...`);
            for (const profile of testProfiles) {
              const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profile.id);
              if (authDeleteError) {
                console.error(`     ❌ Could not delete auth user ${profile.id.substring(0, 8)}...: ${authDeleteError.message}`);
              } else {
                console.log(`     ✓ Deleted auth user ${profile.id.substring(0, 8)}... (this will cascade delete profile)`);
              }
            }
          }
        } else {
          const actuallyDeleted = deletedData?.length || 0;
          console.log(`   ✓ Delete command executed`);
          console.log(`   📊 Reported ${actuallyDeleted} profile(s) deleted`);
          
          // VERIFY DELETION - Fetch again to confirm they're gone
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait for deletion to propagate
          
          const { data: verifyProfiles, error: verifyError } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', profileIds);
          
          if (verifyError) {
            console.log(`   ⚠️  Could not verify deletion (error: ${verifyError.message})`);
          } else {
            const stillExists = (verifyProfiles || []).length;
            if (stillExists > 0) {
              console.error(`   ❌ VERIFICATION FAILED: ${stillExists} profile(s) still exist after deletion!`);
              verifyProfiles.forEach(p => {
                console.error(`     - Still exists: "${p.display_name}" (${p.id.substring(0, 8)}...)`);
              });
              
              // If we have service role key, try deleting auth users directly (this will cascade delete profiles)
              if (supabaseServiceKey) {
                console.log(`   🔐 Attempting to delete ${stillExists} auth user(s) directly (bypasses RLS)...`);
                for (const profile of verifyProfiles) {
                  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profile.id);
                  if (authDeleteError) {
                    console.error(`     ❌ Could not delete auth user ${profile.id.substring(0, 8)}...: ${authDeleteError.message}`);
                  } else {
                    console.log(`     ✓ Deleted auth user ${profile.id.substring(0, 8)}... (this will cascade delete profile)`);
                  }
                }
                
                // Verify again after auth user deletion
                await new Promise(resolve => setTimeout(resolve, 500));
                const { data: finalVerify } = await supabase
                  .from('profiles')
                  .select('id')
                  .in('id', profileIds);
                
                if ((finalVerify || []).length === 0) {
                  console.log(`   ✅ VERIFICATION PASSED: All profiles deleted via auth user deletion`);
                }
              } else {
                console.error('   💡 This indicates RLS is blocking deletion. Add SUPABASE_SERVICE_ROLE_KEY to .env.local');
              }
            } else {
              console.log(`   ✅ VERIFICATION PASSED: All ${testProfiles.length} profile(s) confirmed deleted`);
              
              // Also try to delete from auth.users if we have service role key (cleanup auth table)
              if (supabaseServiceKey && testProfiles.length > 0) {
                console.log(`   🔐 Cleaning up ${testProfiles.length} auth user(s) from auth.users table...`);
                for (const profile of testProfiles) {
                  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profile.id);
                  if (authDeleteError) {
                    console.log(`     ⚠️  Could not delete auth user ${profile.id.substring(0, 8)}...: ${authDeleteError.message}`);
                  } else {
                    console.log(`     ✓ Deleted auth user ${profile.id.substring(0, 8)}...`);
                  }
                }
              }
            }
          }
        }
      } else {
        console.log('   ✓ No test profiles found');
        
        // Show all profiles for debugging
        if ((allProfiles || []).length > 0) {
          console.log('   📋 All profiles in database:');
          (allProfiles || []).forEach(p => {
            const name = p.display_name || '(no name)';
            const role = p.role || 'no role';
            const id = p.id.substring(0, 8);
            console.log(`     - "${name}" (${role}) - ${id}...`);
          });
        } else {
          console.log('   ⚠️  Database appears empty - are you connected to the correct Supabase project?');
          console.log('   💡 Check your NEXT_PUBLIC_SUPABASE_URL in .env.local matches your Supabase dashboard');
        }
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
