# Supabase Setup for Role-Based Authentication

This directory contains database migrations for the 3-role authentication system.

## Roles

The application supports 3 roles:

1. **admin** - Ban điều hành (Administrative Board)
2. **sector_leader** - Phân đoàn trưởng (Sector Leader)
3. **catechist** - Giáo lý viên (Catechist/Teacher)

Note: "Huynh trưởng" and "Dự trưởng" are considered the same role as "Giáo lý viên" (catechist).

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref <your-project-ref>
```

3. Apply migrations:
```bash
supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/20250107_setup_user_roles.sql`
4. Paste and run the SQL query

### Option 3: Manual Application

Connect to your database and run the migration file manually.

## Database Schema

### profiles table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users |
| username | TEXT | User's username |
| role | user_role | User's role (admin, sector_leader, catechist) |
| full_name | TEXT | User's full name |
| sector | TEXT | Sector assignment (Chiên, Ấu, Thiếu, Nghĩa) |
| class_name | TEXT | Class assignment |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Record update time |

## Synchronization Across Applications

Both applications should:

1. **Connect to the same Supabase project** using the same project URL and anon key
2. **Read the role from the `profiles` table** in the `role` column
3. **Use the same role values**: `admin`, `sector_leader`, `catechist`

Example query to get user role:
```sql
SELECT id, username, role, full_name, sector, class_name
FROM profiles
WHERE id = auth.uid();
```

## Row Level Security (RLS)

The migration includes RLS policies:

- **Users** can view and update their own profile (but cannot change their role)
- **Admins** can view, update, insert, and delete all profiles
- **Sector Leaders** and **Catechists** have read-only access to their own profiles

## Changing User Roles

Only admins can change user roles. To manually update a user's role:

```sql
UPDATE profiles
SET role = 'sector_leader'
WHERE id = '<user-uuid>';
```

## Default Role

When a new user signs up, they are automatically assigned the **catechist** role. Admins can then update their role as needed.
