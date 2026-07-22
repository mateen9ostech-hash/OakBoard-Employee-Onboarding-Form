# OakBoard MySQL Migration

This directory contains the target schema for moving OakBoard application data from Supabase PostgreSQL to cPanel MySQL.

## Target requirements

- MySQL 8.0+ or MariaDB 10.6+
- InnoDB
- `utf8mb4`
- JSON column support
- A cPanel database user with all privileges on the OakBoard database
- PHP 8.1+ with PDO MySQL and cURL for the OakBoard API

## Files

- `schema.sql` creates the MySQL application-data tables.
- `private/` is Git-ignored and holds raw exports and generated import files containing private user data.

## Migration order

1. Add `SUPABASE_DB_URL` privately to `.env.local`.
2. Run `npm run db:export:postgres` to create the Git-ignored JSON export.
3. Import `schema.sql` through phpMyAdmin or the MySQL CLI.
4. Create `/home/CPANEL_USER/oakboard-config.php` from `api/config.example.php`.
5. Run `npm run db:import:mysql` from an environment that can reach the cPanel database.
6. Build the Vite application and deploy only `dist/` to the OakBoard subdomain.
7. Run authenticated owner-isolation and CRUD acceptance tests.

The import is idempotent: it updates matching UUID records and does not truncate or delete existing MySQL data. It runs inside a transaction and rolls back the current import if a record fails.

## Authentication boundary

Supabase remains OakBoard's identity provider, so existing users keep their login, OTP, recovery, and UUID ownership links. MySQL stores the synchronized user profile and application data only. Password hashes, OTP records, refresh tokens, and sessions are intentionally never exported to MySQL.

## Required private cPanel settings

Provide these values only in `/home/CPANEL_USER/oakboard-config.php` after creating the database and user:

Use the checked-in `api/config.example.php` structure. The private file must also contain the Supabase URL and publishable key so the PHP API can validate bearer tokens.

Never add real values to `.env.example`, GitHub, screenshots, chat messages, or the public document root.

## Private PostgreSQL export

Obtain the connection URI from Supabase **Project Settings > Database > Connect** and place it directly in `.env.local`:

```env
SUPABASE_DB_URL=postgresql://private-connection-uri
```

Then run:

```powershell
npm run db:export:postgres
```

The command writes `database/mysql/private/oakboard-postgres-export.json`. It intentionally excludes password hashes, OTP records, refresh tokens, and sessions. Remove `SUPABASE_DB_URL` from `.env.local` after the export succeeds.
