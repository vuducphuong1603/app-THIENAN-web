# Role Synchronization Solution

## Problem

When roles are updated in the mobile app (React Native), the changes are reflected in Supabase's `user_profiles` table but not in the `teachers` table. The web app reads from **both tables** and uses the role with higher priority, causing the web app to show stale/incorrect roles.

### Root Cause

The web app's `resolveProfileRole()` function:
1. Reads role from `user_profiles` table
2. **Also** queries `teachers` table for role (via phone number matching)
3. Uses whichever role has **higher priority** (admin=3, sector_leader/phan_doan_truong=2, catechist/giao_ly_vien=1)

**Example of the problem:**
```
user_profiles.role = "phan_doan_truong" (priority 2) ← Updated by mobile app
user_profiles.phone = "0123456789"
teachers.role = "admin" (priority 3)                  ← NOT updated, stale data
teachers.phone = "0123456789"

Result: Web app shows "admin" (wrong!) because it has higher priority
```

### Additional Issues Found

1. **Role value mismatch:**
   - Code uses: `admin`, `sector_leader`, `catechist`
   - Database uses: `admin`, `phan_doan_truong`, `giao_ly_vien`

2. **Linking mechanism:**
   - Tables are linked via **phone number** only
   - `user_profiles.phone` (nullable) ↔ `teachers.phone` (unique, not null)

## Solution Overview

**Automatic Database-Level Sync** ✅

This solution implements automatic synchronization at the database level using PostgreSQL triggers:

- ✅ **Automatic** - No code changes needed in mobile app
- ✅ **Consistent** - One source of truth (`user_profiles` table)
- ✅ **Reliable** - Database-level enforcement
- ✅ **Real-time** - Changes propagate immediately
- ✅ **Phone-based linking** - Uses phone numbers to match users

## Implementation Steps

### Step 1: Apply Database Migration

Run the migration to set up automatic syncing:

```bash
# Option A: Using Supabase CLI (recommended)
cd /home/phuong/Projects/thieunhi-web
supabase db push

# Option B: Manually in Supabase Dashboard
# Go to SQL Editor → Copy/paste the migration file content
# File: supabase/migrations/20250107_sync_roles_between_tables.sql
```

**What this migration does:**

1. ✅ Creates a trigger function that syncs user_profiles → teachers via phone
2. ✅ Sets up trigger to fire when user_profiles.role changes
3. ✅ Performs one-time sync of all existing users
4. ✅ Works with actual database structure (user_profiles, phone-based linking)

### Step 2: Verify Synchronization

After applying the migration, verify that roles are in sync:

```sql
-- Run this query in Supabase SQL Editor
SELECT
    up.id as user_id,
    up.email,
    up.phone,
    up.role as user_profile_role,
    t.id as teacher_id,
    t.full_name as teacher_name,
    t.role as teacher_role,
    CASE
        WHEN up.phone IS NULL THEN 'NO PHONE'
        WHEN t.role IS NULL THEN 'NO TEACHER MATCH'
        WHEN up.role = t.role THEN 'SYNCED ✓'
        ELSE 'MISMATCH ✗'
    END as sync_status
FROM user_profiles up
LEFT JOIN teachers t ON t.phone = up.phone
ORDER BY sync_status, up.email;
```

All users with matching phone numbers should show `SYNCED ✓`.

### Step 3: Test the Solution

Test that updates work correctly:

```sql
-- Update a test user's role in user_profiles table
UPDATE user_profiles
SET role = 'phan_doan_truong'  -- or 'admin' or 'giao_ly_vien'
WHERE email = 'test@example.com';

-- Verify it automatically synced to teachers table
SELECT
    up.email,
    up.phone,
    up.role as user_profile_role,
    t.role as teacher_role
FROM user_profiles up
LEFT JOIN teachers t ON t.phone = up.phone
WHERE up.email = 'test@example.com';

-- Both should show 'phan_doan_truong'
```

## Database Schema

### user_profiles table
- `id` (UUID) - References auth.users
- `email` (TEXT) - User email
- `phone` (TEXT, nullable) - Phone number (used for linking to teachers)
- `role` (TEXT) - One of: `admin`, `phan_doan_truong`, `giao_ly_vien`
- `full_name` (TEXT)
- `saint_name` (TEXT)

### teachers table
- `id` (UUID) - Primary key
- `phone` (TEXT, unique, not null) - Phone number (used for linking)
- `role` (TEXT, nullable) - One of: `admin`, `phan_doan_truong`, `giao_ly_vien`
- `full_name` (TEXT)
- `saint_name`, `first_name`, `last_name` (TEXT)

### Role Values Mapping

| Code Value | Database Value | Vietnamese Label |
|------------|----------------|------------------|
| `admin` | `admin` | Ban điều hành |
| `sector_leader` | `phan_doan_truong` | Phân đoàn trưởng |
| `catechist` | `giao_ly_vien` | Giáo lý viên |

The web app automatically converts between code and database values using `roleToDbValue()` and `dbValueToRole()` functions.

## Usage in Applications

### For Mobile App (React Native)

**No changes needed!** ✅

Continue updating roles as before:

```typescript
// Mobile app can continue doing this
await supabase
  .from('user_profiles')
  .update({ role: 'phan_doan_truong' })  // Use database values
  .eq('id', userId);

// The database trigger automatically syncs to teachers table!
```

**Important:** Mobile app should use the **database role values**:
- `admin` (not `administrator`)
- `phan_doan_truong` (not `sector_leader`)
- `giao_ly_vien` (not `catechist`)

### For Web App (Next.js)

**Option A: Use the utility function** (recommended for admin features)

```typescript
import { updateUserRole } from '@/lib/auth/update-role';
import { useAuth } from '@/providers/auth-provider';

// In your component
const { supabase, refreshProfile } = useAuth();

async function handleRoleChange(userId: string, newRole: AppRole) {
  // Use code values: 'admin', 'sector_leader', 'catechist'
  // The function automatically converts to database values
  const result = await updateUserRole(supabase, userId, newRole);

  if (result.success) {
    // Refresh the current user's profile if they changed their own role
    if (userId === currentUserId) {
      await refreshProfile();
    }
    alert('Role updated successfully');
  } else {
    alert(`Failed to update role: ${result.error}`);
  }
}
```

**Option B: Direct Supabase update** (use database values)

```typescript
import { roleToDbValue } from '@/lib/auth/roles';

// Convert code value to database value
const dbValue = roleToDbValue('sector_leader'); // Returns 'phan_doan_truong'

await supabase
  .from('user_profiles')
  .update({ role: dbValue })
  .eq('id', userId);
```

## How the Trigger Works

```
User or App updates user_profiles.role
         ↓
Database Trigger Fires
         ↓
sync_user_profile_role_to_teachers() function runs
         ↓
Looks up user_profiles.phone
         ↓
Finds matching teachers record by phone
         ↓
Updates teachers.role with the new value
         ↓
Both tables now have same role! ✓
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Supabase Database                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      Trigger       ┌─────────────┐       │
│  │user_profiles │─────────────────────>│  teachers   │       │
│  │              │  Auto-sync on       │             │       │
│  │ • id         │  UPDATE OF role     │ • id        │       │
│  │ • role ★     │  (via phone match)  │ • role      │       │
│  │ • phone  ────┼─────────────────────┼─> phone     │       │
│  │ • email      │                     │ • full_name │       │
│  └──────────────┘                     └─────────────┘       │
│        ↑                                                     │
│        │                                                     │
└────────┼─────────────────────────────────────────────────────┘
         │
         │ UPDATE user_profiles SET role = ?
         │
    ┌────┴─────────────────────────────┐
    │                                   │
┌───┴─────────┐              ┌─────────┴────┐
│ Mobile App  │              │   Web App    │
│             │              │              │
│ React Native│              │   Next.js    │
│             │              │              │
│ Uses DB     │              │ Uses code    │
│ values      │              │ values       │
└─────────────┘              └──────────────┘
```

## Benefits

✅ **Automatic** - No manual intervention needed
✅ **Consistent** - Single source of truth (user_profiles table)
✅ **Backwards Compatible** - Works with existing code
✅ **Real-time** - Changes sync immediately
✅ **Reliable** - Database-level enforcement
✅ **Phone-based** - Correctly links via phone numbers

## Troubleshooting

### Issue: Roles still not syncing

**Check 1: Is the migration applied?**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'sync_user_profile_role_to_teachers_trigger';
```

**Check 2: Does the user have a phone number?**
```sql
-- Sync only works if phone numbers match
SELECT up.email, up.phone, t.phone
FROM user_profiles up
LEFT JOIN teachers t ON t.phone = up.phone
WHERE up.id = '<user-id>';
```

**Check 3: Do you have permission errors?**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

### Issue: Web app still shows old role after update

**Solution 1: Force profile refresh**
```typescript
const { refreshProfile } = useAuth();
await refreshProfile();
```

**Solution 2: Clear browser cookies/session**
```typescript
// Sign out and sign back in
await supabase.auth.signOut();
// Then sign in again
```

### Issue: User has no matching teacher record

If a user in `user_profiles` doesn't have a corresponding `teachers` record (or has a different phone number), the sync won't happen. This is expected.

**Check:**
```sql
SELECT
    up.email,
    up.phone as user_phone,
    t.full_name as teacher_name,
    t.phone as teacher_phone
FROM user_profiles up
LEFT JOIN teachers t ON t.phone = up.phone
WHERE up.id = '<user-id>';
```

If `teacher_name` is NULL, the user doesn't exist in the teachers table or has a different phone number.

## Migration Rollback

If you need to rollback this migration:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS sync_user_profile_role_to_teachers_trigger ON user_profiles;

-- Remove function
DROP FUNCTION IF EXISTS public.sync_user_profile_role_to_teachers();
```

## Testing Checklist

- [ ] Apply migration successfully
- [ ] Verify all existing users with matching phones are synced
- [ ] Update a test user's role in user_profiles table
- [ ] Confirm role synced to teachers table (if phone matches)
- [ ] Test mobile app role update
- [ ] Confirm web app shows correct role after mobile update
- [ ] Test with different roles (admin, phan_doan_truong, giao_ly_vien)
- [ ] Test with user who has no teachers record
- [ ] Test with user who has no phone number
- [ ] Verify web app refreshProfile() works correctly

## Support

If you encounter issues:

1. Check the verification query above
2. Review Supabase logs
3. Ensure migration was applied successfully
4. Check that RLS policies allow role updates
5. Verify you're using the same Supabase project in both apps
6. Ensure phone numbers match between tables

## Related Files

- Migration: `/supabase/migrations/20250107_sync_roles_between_tables.sql`
- Utility function: `/src/lib/auth/update-role.ts`
- Role resolution: `/src/lib/auth/profile-role.ts`
- Role mapping: `/src/lib/auth/roles.ts`
- Auth provider: `/src/providers/auth-provider.tsx`
- Layout: `/src/app/(authenticated)/layout.tsx`
