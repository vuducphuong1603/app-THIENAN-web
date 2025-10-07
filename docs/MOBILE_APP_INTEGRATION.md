# Mobile App Integration Guide

## Role Sync Fix - What You Need to Know

Your mobile app (React Native) is now fully compatible with the web app's role system after a database-level fix has been applied.

## The Problem (Solved!)

✅ **BEFORE:** When you updated user roles in the mobile app, the web app would sometimes show the wrong/old role.

✅ **AFTER:** A database trigger now automatically keeps roles synchronized between tables. **No code changes needed in your mobile app!**

## What Changed

### Database Level (Automatic)
- A PostgreSQL trigger was added to Supabase
- When `user_profiles.role` is updated, it automatically syncs to `teachers.role` via phone number matching
- This happens transparently at the database level

### Mobile App (No Changes Needed!)
- ✅ Your existing code continues to work as-is
- ✅ No package updates required
- ✅ No API changes
- ✅ No breaking changes

## Important: Role Values

Your mobile app should use the **database role values** (NOT code values):

### Correct Database Values ✅
```typescript
'admin'              // Ban điều hành
'phan_doan_truong'   // Phán đoàn trưởng
'giao_ly_vien'       // Giáo lý viên
```

### Incorrect Code Values ❌
```typescript
'sector_leader'      // DON'T use this
'catechist'          // DON'T use this
'administrator'      // DON'T use this
```

## How It Works Now

```typescript
// Your mobile app code (use database values!)
await supabase
  .from('user_profiles')
  .update({ role: 'phan_doan_truong' })  // ✅ Database value
  .eq('id', userId);

// ✨ Magic happens here ✨
// Database trigger automatically syncs to teachers table
// Web app now sees the correct role!
```

## Verification Steps

### 1. Confirm Migration is Applied

Ask your backend/DevOps team to confirm the migration was run:

```sql
-- They should run this in Supabase SQL Editor
SELECT EXISTS (
  SELECT 1 FROM pg_trigger
  WHERE tgname = 'sync_user_profile_role_to_teachers_trigger'
) as migration_applied;

-- Should return: migration_applied = true
```

### 2. Test Role Updates

In your React Native app:

```typescript
// Update a test user's role
const { data, error } = await supabase
  .from('user_profiles')
  .update({ role: 'admin' })  // or 'phan_doan_truong' or 'giao_ly_vien'
  .eq('id', testUserId);

if (!error) {
  console.log('Role updated successfully');
  // Web app should now show the new role immediately!
}
```

### 3. Verify on Web App

1. Update a role in mobile app
2. Log in to web app with that user
3. Check that the role displays correctly

## Available Roles

Your mobile app should use these **exact database values**:

```typescript
type DatabaseRole = 'admin' | 'phan_doan_truong' | 'giao_ly_vien';

// Vietnamese names (for UI display)
const roleLabels = {
  admin: 'Ban điều hành',
  phan_doan_truong: 'Phân đoàn trưởng',
  giao_ly_vien: 'Giáo lý viên',
};
```

## Best Practices

### ✅ DO

- Use the `user_profiles` table for role updates
- Use the exact database values: `'admin'`, `'phan_doan_truong'`, `'giao_ly_vien'`
- Handle Supabase errors appropriately
- Ensure user has a phone number (required for sync to teachers table)

### ❌ DON'T

- Don't try to update the `teachers` table directly (trigger handles it)
- Don't use code values like `'sector_leader'` or `'catechist'`
- Don't implement your own sync logic (database handles it)
- Don't use different spellings or cases

## Example: Complete Role Update Flow

```typescript
import { supabase } from './supabaseClient';

type DatabaseRole = 'admin' | 'phan_doan_truong' | 'giao_ly_vien';

// Function to update user role
async function updateUserRole(userId: string, newRole: DatabaseRole) {
  try {
    // Update the user_profiles table with database value
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update role:', error);
      return { success: false, error: error.message };
    }

    console.log('Role updated successfully:', data);

    // That's it! The database trigger automatically syncs to teachers table.
    // No need to do anything else.

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Usage - use database values!
await updateUserRole('user-uuid-here', 'phan_doan_truong');
```

## Example: UI Component with Proper Values

```typescript
import React, { useState } from 'react';
import { View, Text, Picker, Button, Alert } from 'react-native';
import { supabase } from './supabaseClient';

type DatabaseRole = 'admin' | 'phan_doan_truong' | 'giao_ly_vien';

export function RoleUpdateComponent({ userId }: { userId: string }) {
  const [selectedRole, setSelectedRole] = useState<DatabaseRole>('giao_ly_vien');
  const [loading, setLoading] = useState(false);

  const handleUpdateRole = async () => {
    setLoading(true);

    try {
      // Use database values, not code values!
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: selectedRole })
        .eq('id', userId);

      if (error) {
        Alert.alert('Error', 'Failed to update role');
        console.error(error);
      } else {
        Alert.alert('Success', 'Role updated successfully');
        // Database trigger automatically synced to teachers table!
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text>Select Role:</Text>
      <Picker
        selectedValue={selectedRole}
        onValueChange={(value) => setSelectedRole(value as DatabaseRole)}
        enabled={!loading}
      >
        {/* Use database values in Picker.Item value prop */}
        <Picker.Item label="Giáo lý viên" value="giao_ly_vien" />
        <Picker.Item label="Phân đoàn trưởng" value="phan_doan_truong" />
        <Picker.Item label="Ban điều hành" value="admin" />
      </Picker>
      <Button
        title={loading ? 'Updating...' : 'Update Role'}
        onPress={handleUpdateRole}
        disabled={loading}
      />
    </View>
  );
}
```

## Role Value Mapping Reference

| Database Value (Use This!) | Code Value (Don't Use) | Vietnamese Label |
|----------------------------|------------------------|------------------|
| `admin` | `admin` | Ban điều hành |
| `phan_doan_truong` | `sector_leader` | Phân đoàn trưởng |
| `giao_ly_vien` | `catechist` | Giáo lý viên |

**Important:** Always use the values in the "Database Value" column in your mobile app!

## Troubleshooting

### Issue: Web app still shows old role

**Possible causes:**
1. Migration not applied to database yet
2. User's phone number doesn't match between `user_profiles` and `teachers` tables
3. Web app user needs to log out and log back in
4. Browser cache issue on web app

**Solution:**
- Confirm migration is applied (see Verification Steps above)
- Check that user has a phone number in user_profiles
- Check that phone number matches a teacher record
- Ask web app user to log out and log back in
- Not a mobile app issue!

### Issue: Role update fails with constraint violation

**Error message:** `new row for relation "user_profiles" violates check constraint "user_profiles_role_check"`

**Cause:** You're using incorrect role values (probably code values instead of database values)

**Solution:** Use database values:
```typescript
// ❌ WRONG - will fail
await supabase.from('user_profiles').update({ role: 'sector_leader' });

// ✅ CORRECT - will work
await supabase.from('user_profiles').update({ role: 'phan_doan_truong' });
```

### Issue: Role synced to user_profiles but not teachers

**Possible causes:**
1. User has no phone number in `user_profiles`
2. Phone number doesn't match any teacher record
3. Teachers table has different phone number format

**Check:**
```sql
-- Run in Supabase SQL Editor to check phone match
SELECT
    up.email,
    up.phone as user_phone,
    t.full_name,
    t.phone as teacher_phone
FROM user_profiles up
LEFT JOIN teachers t ON t.phone = up.phone
WHERE up.id = '<user-id>';
```

If `t.full_name` is NULL, the user doesn't have a matching teacher record.

### Issue: Network/Auth errors

**Check these:**

1. **Authentication** - Is the user logged in?
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  Alert.alert('Error', 'You must be logged in');
}
```

2. **RLS Policies** - Does the user have permission?
```typescript
// Only admins can update other users' roles
// Users cannot update their own role
```

3. **Valid Role Value** - Are you using database values?
```typescript
// ✅ Correct
role: 'admin'
role: 'phan_doan_truong'
role: 'giao_ly_vien'

// ❌ Wrong
role: 'Admin'  // Capital A
role: 'sector_leader'  // Code value
role: 'catechist'  // Code value
```

## Database Schema Reference

### user_profiles table
```typescript
type UserProfile = {
  id: string;                    // UUID, references auth.users
  email: string;                 // User's email
  phone: string | null;          // Phone number (for linking to teachers)
  role: 'admin' | 'phan_doan_truong' | 'giao_ly_vien';  // User's role
  full_name: string | null;      // Full name
  saint_name: string | null;     // Saint name
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
};
```

### teachers table (for reference)
```typescript
type Teacher = {
  id: string;                    // UUID
  phone: string;                 // Phone number (unique, not null)
  role: string | null;           // User's role (synced from user_profiles)
  full_name: string;             // Full name
  saint_name: string;            // Saint name
  first_name: string;            // First name
  last_name: string;             // Last name
  class_name: string | null;     // Class name
  sector: string | null;         // Sector
  // ... other fields
};
```

## Support

If you encounter issues:

1. **Check phone numbers** - Sync only works when phone numbers match
2. **Verify role values** - Must use exact database values
3. **Check Supabase logs** - Dashboard > Database > Logs
4. **Verify migration applied** - Run the verification SQL query above
5. **Test with admin user** - RLS policies may prevent non-admin updates
6. **Check error messages** - Log all error responses from Supabase

## Summary

✅ **No mobile app code changes needed** (just use correct role values!)
✅ **Database handles sync automatically** (via phone number matching)
✅ **Continue using existing update code** (to `user_profiles` table)
✅ **Web app will now show correct roles** (after trigger sync)
✅ **Use database values** (`phan_doan_truong`, not `sector_leader`)

The fix is entirely at the database level using PostgreSQL triggers. Your mobile app can continue working with minimal changes - just ensure you're using the correct database role values!

## Quick Reference Card

```typescript
// ✅ CORRECT WAY
await supabase
  .from('user_profiles')
  .update({
    role: 'phan_doan_truong'  // Database value
  })
  .eq('id', userId);

// ❌ WRONG WAY
await supabase
  .from('user_profiles')
  .update({
    role: 'sector_leader'  // Code value - will fail!
  })
  .eq('id', userId);
```
