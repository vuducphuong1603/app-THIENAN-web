# Fix User Role Issue - Instructions

## Problem
User with phone `0981981614` shows "Giáo lý viên" (Catechist) but should show "Ban điều hành" (Admin).

## Root Cause
The `profiles` table stores the role as ENUM values:
- `'admin'` → displays "Ban điều hành"
- `'sector_leader'` → displays "Phân đoàn trưởng"
- `'catechist'` → displays "Giáo lý viên"

The user's role in the database is `'catechist'` but needs to be `'admin'`.

**Important**: The database CANNOT store "ban điều hành" directly. It must be the ENUM value `'admin'`.

## Solution Steps

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor** (in the left sidebar)

2. **Run the Fix Script**
   - Open the file: `supabase/fix_user_role.sql`
   - Copy and paste it into the SQL Editor
   - Execute each section step by step:
     - **Step 1**: Run the SELECT query to find the user
     - **Step 2**: Run the UPDATE query to change the role
     - **Step 3**: Run the SELECT query again to verify

### Option 2: Using Supabase CLI

```bash
cd /home/phuong/Projects/thieunhi-web
supabase db execute --file supabase/fix_user_role.sql
```

### Option 3: Direct SQL (if you know the user ID)

If you already know the user's UUID, you can run this directly:

```sql
-- Replace <user-uuid> with the actual UUID
UPDATE profiles
SET role = 'admin'
WHERE id = '<user-uuid>';
```

## After Running the Fix

1. **Clear browser cache** or use incognito mode
2. **Log out** of the application
3. **Log back in** with the account (0981981614)
4. The role should now display as "Ban điều hành" instead of "Giáo lý viên"

## Verification

After logging back in, verify:
- ✅ Top-right corner shows "Ban điều hành" (not "Giáo lý viên")
- ✅ Navigation menu shows all admin options (Users, Classes, Students, etc.)
- ✅ Full admin permissions are available

## Technical Details

### Why the teacher table lookup doesn't work:
The code in `src/lib/auth/profile-role.ts` tries to look up roles from a `teachers` or `teacher` table, but this table doesn't exist in your database migrations. So it always falls back to the `profiles.role` value.

### How role resolution works:
1. Fetches role from `profiles` table
2. Tries to fetch role from `teachers` table (fails - table doesn't exist)
3. Uses the profile role
4. Normalizes the role value using `normalizeAppRole()`
5. Gets display label using `getRoleLabel()`

### Valid role values:
- Database stores: `'admin'` | `'sector_leader'` | `'catechist'`
- Display shows: "Ban điều hành" | "Phân đoàn trưởng" | "Giáo lý viên"

## Future: Changing Other User Roles

To change roles for other users in the future:

```sql
-- Find user by username/phone
SELECT id, username, role, full_name
FROM profiles
WHERE username LIKE '%phone_number%';

-- Update to admin
UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';

-- Update to sector leader
UPDATE profiles SET role = 'sector_leader' WHERE id = '<user-uuid>';

-- Update to catechist
UPDATE profiles SET role = 'catechist' WHERE id = '<user-uuid>';
```

## Questions?

Refer to `ROLE_SYSTEM_SETUP.md` for the complete role system documentation.
