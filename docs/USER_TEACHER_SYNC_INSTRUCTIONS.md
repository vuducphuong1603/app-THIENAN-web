# User-Teacher Data Synchronization Instructions

## Overview
This document provides instructions for synchronizing user data between the `user_profiles` and `teachers` tables to fix the issue where sector/class information is not displayed in the user management interface.

## Problem Description
- The user management interface displays "N/A" or "Chưa phân công" for some users' sector/class information
- This happens because the data is fetched from the `teachers` table, but not all users have corresponding records or complete data in that table

## Solution Components

### 1. Database Migration
**File:** `supabase/migrations/20250114_sync_user_teacher_data.sql`
- Creates/updates teacher records for all users
- Syncs sector and class information between tables
- Sets up automatic triggers for future synchronization

### 2. Updated User Actions
**File:** `src/lib/actions/users.ts`
- Modified `createUser` function to properly sync with teachers table
- Modified `updateUser` function to ensure data consistency
- Added logic to derive sector from class when needed

### 3. One-time Sync Script
**File:** `supabase/sync_user_teacher_data.sql`
- Manual script to sync all existing data
- Provides before/after statistics
- Lists any remaining issues

## Implementation Steps

### Step 1: Run the Migration in Supabase

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/20250114_sync_user_teacher_data.sql`
5. Click **Run**
6. You should see output messages showing the synchronization summary

### Step 2: Run the One-time Sync Script (Optional but Recommended)

1. In the Supabase SQL Editor, create another new query
2. Copy and paste the contents of `supabase/sync_user_teacher_data.sql`
3. Click **Run**
4. Review the output:
   - BEFORE SYNC statistics
   - AFTER SYNC statistics
   - List of any users still needing attention

### Step 3: Deploy the Updated Code

Deploy the updated `users.ts` file to your application:

```bash
git add .
git commit -m "Fix user-teacher data synchronization for sector/class display"
git push
```

### Step 4: Test the Changes

1. **Check Existing Users:**
   - Go to the user management page
   - Verify that users now display their sector and class information correctly
   - Users should show "Ngành [Sector Name]" and their assigned class

2. **Test Creating New User:**
   - Click "Thêm người dùng"
   - Fill in the form with:
     - Phone number
     - Password
     - Full name
     - Role
     - Select a Sector (Ngành)
     - Select a Class (Lớp)
   - Create the user
   - Verify the new user displays with correct sector/class information

3. **Test Updating User:**
   - Click "Chỉnh sửa" on any user
   - Change their sector or class
   - Save the changes
   - Verify the updated information displays correctly

4. **Verify in Database (Optional):**
   Run this query in Supabase SQL Editor to check the sync status:

```sql
SELECT
    up.id as user_id,
    up.phone,
    up.full_name as user_name,
    up.sector as user_sector,
    up.class_id as user_class_id,
    t.sector as teacher_sector,
    t.class_id as teacher_class_id,
    t.class_name as teacher_class_name,
    CASE
        WHEN t.phone IS NULL THEN 'NO TEACHER RECORD'
        WHEN t.sector IS NULL THEN 'MISSING SECTOR'
        WHEN t.class_id IS NULL THEN 'MISSING CLASS'
        ELSE 'SYNCED'
    END as sync_status
FROM user_profiles up
LEFT JOIN teachers t ON t.phone = up.phone
WHERE up.phone IS NOT NULL
ORDER BY sync_status, up.full_name;
```

## Troubleshooting

### If some users still show "N/A" for sector/class:

1. Check if those users have phone numbers:
```sql
SELECT * FROM user_profiles WHERE phone IS NULL OR phone = '';
```

2. Check if their teacher records exist:
```sql
SELECT up.phone, up.full_name, t.id as teacher_id
FROM user_profiles up
LEFT JOIN teachers t ON t.phone = up.phone
WHERE up.phone IS NOT NULL AND t.id IS NULL;
```

3. Manually run the sync for specific users:
```sql
-- Replace '0912345678' with the actual phone number
UPDATE teachers t
SET
    sector = up.sector,
    class_id = up.class_id,
    updated_at = NOW()
FROM user_profiles up
WHERE t.phone = up.phone
  AND up.phone = '0912345678';
```

### If new users don't sync automatically:

1. Verify the triggers are created:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%sync%teacher%';
```

2. Check for errors in the Supabase logs

## Expected Results

After completing these steps:
1. All users should display their sector (Ngành) correctly
2. All users should display their class name correctly
3. New users created will automatically have their data synchronized
4. Updates to user information will automatically sync to the teachers table

## Rollback Instructions

If you need to rollback these changes:

1. Remove the triggers:
```sql
DROP TRIGGER IF EXISTS sync_user_profile_to_teacher_on_insert ON user_profiles;
DROP TRIGGER IF EXISTS sync_user_profile_to_teacher_on_update ON user_profiles;
DROP FUNCTION IF EXISTS public.sync_user_profile_to_teacher();
```

2. Revert the code changes in `src/lib/actions/users.ts`

## Support

If you encounter any issues:
1. Check the Supabase logs for any error messages
2. Verify that both tables have the expected columns
3. Ensure phone numbers are properly formatted and unique