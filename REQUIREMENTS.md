# OakBoard Requirements

## Development machine

- Node.js 20.19–24.x
- npm 10–11
- Git
- Modern browser
- Optional PHP 8.1+ for local API testing

The checked-in lockfile is authoritative. Install with `npm ci`.

## Production cPanel account

- Apache with `.htaccess`, `mod_rewrite`, and PHP support
- PHP 8.1 or newer
- PHP extensions: PDO MySQL, cURL, mbstring, JSON, OpenSSL
- MySQL 8.0+ or MariaDB 10.6+
- InnoDB, `utf8mb4`, and JSON column support
- A database user limited to the OakBoard database
- HTTPS for `onboarding.9ostech.com`

Production does **not** require Node.js, Passenger, Application Manager, PM2, systemd, or an Apache restart.

## Browser environment

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_API_BASE_URL=/api
VITE_SITE_URL=https://onboarding.9ostech.com
```

These are browser-visible by design. Never add MySQL, Resend, service-role, or SMTP secrets.

## Private PHP configuration

Create `/home/CPANEL_USER/oakboard-config.php` from `api/config.example.php` and set mode `600`. It contains:

- MySQL host, port, database, username, and password
- Supabase project URL and publishable key used to validate access tokens

## External services

- Supabase Auth for user identity, OTP, recovery, and sessions
- Supabase Edge Functions for import/email operations
- Resend for authenticated PDF email delivery
- cPanel MySQL/MariaDB for owner-scoped plans and application records
