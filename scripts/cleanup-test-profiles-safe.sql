-- SAFE VERSION: Shows what will be deleted BEFORE deleting
-- Run this first to see what will be deleted, then run cleanup-test-profiles.sql

-- Preview: Test profiles that will be deleted
SELECT 
  'PROFILES TO DELETE' as action,
  id,
  display_name,
  role,
  created_at
FROM profiles
WHERE LOWER(TRIM(display_name)) LIKE '%test%'
   OR LOWER(TRIM(display_name)) = 'test user'
   OR display_name IS NULL
ORDER BY created_at DESC;

-- Preview: Auth users that might be orphaned
SELECT 
  'AUTH USERS TO DELETE' as action,
  id,
  email,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
  AND (
    email IS NULL 
    OR LOWER(email) LIKE '%test%'
    OR LOWER(email) LIKE '%vitest%'
  )
ORDER BY created_at DESC;

-- Preview: Reviews that will be deleted
SELECT 
  'REVIEWS TO DELETE' as action,
  id,
  reviewer_name,
  venue_id,
  user_id,
  created_at
FROM reviews
WHERE user_id NOT IN (SELECT id FROM profiles)
  OR reviewer_name ILIKE '%test%'
  OR reviewer_name ILIKE '%vitest%'
  OR reviewer_name ILIKE '%anonymous reviewer%'
ORDER BY created_at DESC;
