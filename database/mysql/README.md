# OakBoard MySQL Migration

This directory contains the target schema for moving OakBoard application data from Supabase PostgreSQL to cPanel MySQL.

## Target requirements

- MySQL 8.0+ or MariaDB 10.6+
- InnoDB
- `utf8mb4`
- JSON column support
- A cPanel database user with all privileges on the OakBoard database
- A cPanel Node.js application runtime for the Next.js server

## Files

- `schema.sql` creates the MySQL application and authentication tables.
- `private/` is Git-ignored and holds raw exports and generated import files containing private user data.

## Migration order

1. Add `SUPABASE_DB_URL` privately to `.env.local`.
2. Run `npm run db:export:postgres` to create the Git-ignored JSON export.
3. Import `schema.sql` through phpMyAdmin or the MySQL CLI.
4. Add the MySQL variables below privately to `.env.local` or cPanel.
5. Run `npm run db:import:mysql` from an environment that can reach the cPanel database.
6. Set `PLAN_DATABASE_BACKEND=mysql` in cPanel only after the import succeeds.
7. Run the application build and authenticated acceptance tests.

The import is idempotent: it updates matching UUID records and does not truncate or delete existing MySQL data. It runs inside a transaction and rolls back the current import if a record fails.

## Authentication limitation

Supabase password hashes, OTP state, refresh tokens, and sessions are not portable as ordinary application data. Existing users will keep their UUID ownership links, but they must set a new password through the migrated authentication flow. Do not export Supabase secrets or session tokens into MySQL.

## Required cPanel settings

Provide these values privately after creating the database and user:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=cpanelprefix_oakboard
MYSQL_USER=cpanelprefix_oakboard_user
MYSQL_PASSWORD=replace_with_private_password
PLAN_DATABASE_BACKEND=mysql
```

Never add the real values to `.env.example`, GitHub, screenshots, or chat messages. Add them only to the cPanel application's environment-variable interface or a private `.env.local` file on the server.

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
