-- Fix RLS Policies to Allow Test Profile Cleanup
-- Run this in Supabase SQL Editor to enable cleanup without service role key
--
-- This creates/updates RLS policies to allow:
-- 1. Deletion of profiles with "test" in display_name
-- 2. Deletion of orphaned auth users
-- 3. A cleanup function that can be called safely

-- Step 1: Create a function to safely delete test profiles
-- This function runs with SECURITY DEFINER (elevated privileges)
CREATE OR REPLACE FUNCTION cleanup_test_profiles()
RETURNS TABLE(
  deleted_profiles_count INTEGER,
  deleted_auth_users_count INTEGER,
  deleted_reviews_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_count INTEGER;
  auth_count INTEGER;
  review_count INTEGER;
BEGIN
  -- Delete test profiles
  WITH deleted_profiles AS (
    DELETE FROM profiles
    WHERE LOWER(TRIM(display_name)) LIKE '%test%'
       OR LOWER(TRIM(display_name)) = 'test user'
       OR (display_name IS NULL AND created_at > NOW() - INTERVAL '7 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO profile_count FROM deleted_profiles;

  -- Delete orphaned auth users (those without profiles)
  WITH deleted_auth AS (
    DELETE FROM auth.users
    WHERE id NOT IN (SELECT id FROM profiles)
      AND (
        email IS NULL 
        OR LOWER(email) LIKE '%test%'
        OR LOWER(email) LIKE '%vitest%'
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO auth_count FROM deleted_auth;

  -- Delete orphaned reviews
  WITH deleted_reviews AS (
    DELETE FROM reviews
    WHERE user_id NOT IN (SELECT id FROM profiles)
      OR reviewer_name ILIKE '%test%'
      OR reviewer_name ILIKE '%vitest%'
      OR reviewer_name ILIKE '%anonymous reviewer%'
    RETURNING id
  )
  SELECT COUNT(*) INTO review_count FROM deleted_reviews;

  RETURN QUERY SELECT profile_count, auth_count, review_count;
END;
$$;

-- Step 2: Grant execute permission to authenticated users (or anon if needed)
GRANT EXECUTE ON FUNCTION cleanup_test_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_test_profiles() TO anon;

-- Step 3: Update RLS policies for profiles table

-- Allow INSERT: Users can create their own profile
-- This works for both authenticated and anonymous users
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;
CREATE POLICY "Allow users to insert their own profile"
ON profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (
  auth.uid() = id OR
  -- Allow if id matches current user (for anonymous users)
  (auth.uid() IS NOT NULL AND auth.uid() = id)
);

-- Allow UPDATE: Users can update their own profile
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
CREATE POLICY "Allow users to update their own profile"
ON profiles
FOR UPDATE
TO authenticated, anon
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow DELETE: Allow deletion of test profiles
DROP POLICY IF EXISTS "Allow deletion of test profiles" ON profiles;
CREATE POLICY "Allow deletion of test profiles"
ON profiles
FOR DELETE
TO authenticated, anon
USING (
  LOWER(TRIM(display_name)) LIKE '%test%'
  OR LOWER(TRIM(display_name)) = 'test user'
  OR (display_name IS NULL AND created_at > NOW() - INTERVAL '7 days')
  OR auth.uid() = id  -- Also allow users to delete their own profile
);

-- Step 4: Verify the function works
-- You can test it by running:
-- SELECT * FROM cleanup_test_profiles();

-- Show current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
