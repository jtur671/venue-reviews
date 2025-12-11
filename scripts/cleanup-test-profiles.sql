-- Cleanup Test Profiles SQL Script
-- Run this directly in Supabase SQL Editor (bypasses RLS)
-- 
-- This will delete:
-- 1. Test profiles from the profiles table
-- 2. Associated auth users from auth.users table
-- 3. Any reviews created by these test users

-- Step 1: Delete test profiles (and cascade to auth.users if foreign key is set up)
-- This targets profiles with display_name containing "test" (case-insensitive)
DELETE FROM profiles
WHERE LOWER(TRIM(display_name)) LIKE '%test%'
   OR LOWER(TRIM(display_name)) = 'test user'
   OR display_name IS NULL;  -- Also delete profiles with no name (often test data)

-- Step 2: If profiles are deleted but auth users remain, delete them too
-- This deletes auth users that don't have a corresponding profile
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
  AND (
    -- Check if email contains test patterns (if emails exist)
    email IS NULL 
    OR LOWER(email) LIKE '%test%'
    OR LOWER(email) LIKE '%vitest%'
  );

-- Step 3: Clean up any orphaned reviews from deleted test users
DELETE FROM reviews
WHERE user_id NOT IN (SELECT id FROM profiles)
  OR reviewer_name ILIKE '%test%'
  OR reviewer_name ILIKE '%vitest%'
  OR reviewer_name ILIKE '%anonymous reviewer%';

-- Step 4: Verify deletion - show remaining profiles
SELECT 
  id,
  display_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- If you want to see what was deleted, run this BEFORE the DELETE statements:
-- SELECT id, display_name, role, created_at 
-- FROM profiles 
-- WHERE LOWER(TRIM(display_name)) LIKE '%test%' 
--    OR LOWER(TRIM(display_name)) = 'test user';
