# IMPORTANT: Apply Migration First!

## The profiles table doesn't exist yet

You need to create the `profiles` table before fixing the role.

## Step 1: Apply the Database Migration

### Option A: Using Supabase Dashboard SQL Editor

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy the entire contents** of `supabase/migrations/20250107_setup_user_roles.sql`
3. **Paste and execute** in the SQL Editor
4. **Wait for success confirmation**

### Option B: Using Supabase CLI (if installed)

```bash
cd /home/phuong/Projects/thieunhi-web
supabase db push
```

## Step 2: After Migration Success

Once the migration is applied (the `profiles` table is created), you need to check if your user data exists:

### Check if your profile exists:

```sql
SELECT id, username, role, full_name
FROM profiles;
```

### If the profile doesn't exist:

The migration includes a trigger that automatically creates profiles for new users. But existing users might not have profiles yet.

**If your user (0981981614) is not in the profiles table**, you need to create it manually:

```sql
-- Replace <your-user-uuid> with your actual user ID from auth.users
INSERT INTO profiles (id, username, role, full_name)
SELECT
    id,
    COALESCE(email, phone, '0981981614'),
    'admin',
    COALESCE(raw_user_meta_data->>'full_name', 'Vũ Đức Phương')
FROM auth.users
WHERE phone = '0981981614'
   OR email LIKE '%0981981614%'
   OR raw_user_meta_data->>'phone' = '0981981614';
```

### If the profile exists but has wrong role:

Run the fix script from `supabase/fix_user_role.sql`:

```sql
UPDATE profiles
SET role = 'admin'
WHERE username LIKE '%0981981614%';
```

## Step 3: Verify

```sql
SELECT id, username, role, full_name
FROM profiles
WHERE username LIKE '%0981981614%';
```

Expected result: `role = 'admin'`

## Step 4: Test in Application

1. Log out
2. Log back in with 0981981614
3. Should see "Ban điều hành" instead of "Giáo lý viên"

## Need Help Finding Your User?

```sql
-- Check all users in auth.users
SELECT
    id,
    email,
    phone,
    raw_user_meta_data->>'full_name' as full_name,
    created_at
FROM auth.users
WHERE phone = '0981981614'
   OR email LIKE '%0981981614%'
ORDER BY created_at DESC;
```
