# Role System Setup - Summary

## Changes Made

Your application now supports **3 roles** instead of 2:

1. **admin** - Ban điều hành (Administrative Board)
2. **sector_leader** - Phân đoàn trưởng (Sector Leader) - **NEW**
3. **catechist** - Giáo lý viên (Catechist/Teacher)

### Files Modified

#### 1. `/src/types/auth.ts`
- Updated `AppRole` type to include `"sector_leader"`

#### 2. `/src/app/(authenticated)/layout.tsx`
- Updated `mapRole()` function to handle `sector_leader` role
- Updated `roleLabel()` function to display "Phân đoàn trưởng" for sector leaders
- Updated `buildSections()` function to provide appropriate navigation for sector leaders:
  - Dashboard
  - Lớp học (Classes)
  - Thiếu nhi (Students)
  - Báo cáo (Reports)
  - Cài đặt (Settings)

### Files Created

#### 3. `/supabase/migrations/20250107_setup_user_roles.sql`
Complete database migration with:
- `user_role` enum type with 3 roles
- `profiles` table schema
- Row Level Security (RLS) policies
- Automatic profile creation on user signup
- Proper indexes for performance

#### 4. `/supabase/README.md`
Documentation for:
- How to apply migrations
- Database schema
- How to synchronize roles across 2 applications
- How to change user roles

## Next Steps

### Step 1: Apply Database Migration

Choose one of these methods:

**Option A: Supabase CLI (Recommended)**
```bash
cd /home/phuong/Projects/thieunhi-web
supabase db push
```

**Option B: Supabase Dashboard**
1. Go to your Supabase project
2. Open **SQL Editor**
3. Copy contents from `supabase/migrations/20250107_setup_user_roles.sql`
4. Run the query

### Step 2: Verify Your Second Application

Make sure your second application:
1. Connects to the **same Supabase project** (same URL and anon key)
2. Reads the `role` column from the `profiles` table
3. Uses the same role values: `"admin"`, `"sector_leader"`, `"catechist"`

### Step 3: Assign Roles to Existing Users

After applying the migration, update user roles in Supabase:

```sql
-- Make someone an admin
UPDATE profiles
SET role = 'admin'
WHERE id = '<user-uuid>';

-- Make someone a sector leader
UPDATE profiles
SET role = 'sector_leader'
WHERE id = '<user-uuid>';

-- Default is catechist (no update needed)
```

You can run these queries in the Supabase SQL Editor.

### Step 4: Test the Role System

1. Log in with different role accounts
2. Verify navigation options match the role:
   - **Admin**: Full access to all features
   - **Sector Leader**: Dashboard + Classes + Students + Reports + Settings
   - **Catechist**: Dashboard + Students + Reports + Settings

## How Roles Sync Across Applications

Both applications will automatically sync roles because:
- They connect to the **same Supabase database**
- They read from the **same `profiles` table**
- The `role` column is the **single source of truth**

When a user's role changes in the database, both applications will see the updated role on next login or session refresh.

## Role Mapping Reference

| Database Value | English | Vietnamese |
|----------------|---------|------------|
| `admin` | Admin | Ban điều hành |
| `sector_leader` | Sector Leader | Phân đoàn trưởng |
| `catechist` | Catechist/Teacher | Giáo lý viên |

**Note**: "Huynh trưởng" and "Dự trưởng" should be assigned the `catechist` role.

## Troubleshooting

### Users are not seeing correct permissions
- Check the `role` column in the `profiles` table
- Verify RLS policies are enabled
- Have the user log out and log back in

### Role not syncing between applications
- Verify both apps use the same Supabase project
- Check that both apps read from `profiles.role`
- Ensure both apps use the same role values

### Need to add more roles in the future
1. Update the enum in the migration: `ALTER TYPE user_role ADD VALUE 'new_role';`
2. Update `src/types/auth.ts`
3. Update role mapping functions in `layout.tsx`
4. Update navigation in `buildSections()`

## Questions?

Refer to `/supabase/README.md` for detailed database documentation.
