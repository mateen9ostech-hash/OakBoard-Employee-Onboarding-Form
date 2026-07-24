# OakBoard MySQL Database

MySQL remains outside the Docker container and is the system of record for:

- users and password hashes;
- sessions and one-time tokens;
- onboarding plans and imports;
- email delivery logs.

## Requirements

- MySQL 8.0+ or MariaDB 10.6+
- InnoDB, `utf8mb4`, and JSON support
- a dedicated OakBoard database and least-privilege database user

## First deployment

1. Back up the OakBoard database if it already contains data.
2. Import `schema.sql` with phpMyAdmin or the MySQL CLI.
3. Put the connection values only in `/home/ostech/oakboard-config.php`.
4. Start the container. Its preflight verifies connectivity and required tables
   without creating, deleting, or modifying schema.

The Docker deployment does not run a MySQL container and does not change cPanel's
global MySQL service. Database migrations must be reviewed and backed up before
they are applied.

Never commit credentials or place them in browser-readable Vite environment
files.
