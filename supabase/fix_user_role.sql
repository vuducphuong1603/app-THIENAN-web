-- Fix role for user with phone 0981981614
-- This script updates the role from 'catechist' to 'admin' to display "Ban điều hành"

-- Step 1: Find the user (check current role)
-- Run this first to verify we found the right user
SELECT
    id,
    username,
    role,
    full_name,
    sector,
    class_name
FROM profiles
WHERE username LIKE '%0981981614%';

-- Step 2: Update the role to 'admin'
-- After verifying the user above, run this to update the role
UPDATE profiles
SET role = 'admin'
WHERE username LIKE '%0981981614%';

-- Step 3: Verify the change
-- Run this to confirm the role was updated
SELECT
    id,
    username,
    role,
    full_name,
    sector,
    class_name
FROM profiles
WHERE username LIKE '%0981981614%';

-- Expected result: role should now be 'admin' (will display as "Ban điều hành" in the UI)
