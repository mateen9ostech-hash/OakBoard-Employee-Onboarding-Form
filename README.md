# OakBoard Employee Onboarding Plans

> Start with [`START-HERE.md`](START-HERE.md) when continuing on a new machine.

OakBoard creates, stores, previews, exports, and emails role-specific employee onboarding plans.

## Migration branch architecture

This branch replaces the former server-rendered runtime with an isolated cPanel-compatible stack:

```text
Browser
  -> Vite + React + TypeScript SPA
  -> same-origin PHP 8 REST API
  -> cPanel MySQL / MariaDB

Supabase Auth -> identity, signup OTP, sessions
Supabase Edge Function + Resend -> PDF email delivery
```

The browser never receives MySQL credentials. The PHP API validates every Supabase access token, upserts the authenticated identity into `app_users`, and scopes every plan query by that user's UUID.

## Routes

| URL | Purpose |
| --- | --- |
| `/` | Public product page |
| `/sign-in` | Sign in, signup, OTP, and recovery |
| `/auth/callback` | Supabase PKCE callback |
| `/workspace` | Authenticated dashboard |
| `/plans/new` | New-plan workflow |
| `/plans/archived` | Archived plans |
| `/plans/{id}` | Owner-scoped preview and export |
| `/plans/{id}/edit` | Owner-scoped plan editor |

## Local frontend

```powershell
Copy-Item .env.example .env.local
npm ci
npm run typecheck
npm run lint
npm run build
npm run dev
```

Open <http://127.0.0.1:3000/sign-in>.

The MySQL API requires PHP and a local private configuration. See [`CPANEL-DEPLOYMENT.md`](CPANEL-DEPLOYMENT.md) for production setup and [`database/mysql/README.md`](database/mysql/README.md) for schema/import details.

## Build output

`npm run build` creates `dist/` containing:

- the static React application;
- OakBoard assets and route fallback `.htaccess`;
- the PHP API under `dist/api/`.

Only the contents of `dist/` are deployed to the OakBoard subdomain. Passenger, a persistent Node.js process, Apache rebuilds, and server-wide cPanel changes are not required.

## Security boundaries

- Real Vite public values go only in `.env.local`; never commit it.
- MySQL credentials go in `/home/CPANEL_USER/oakboard-config.php`, outside `public_html`.
- Resend secrets remain in Supabase Edge Function secrets.
- All plan CRUD statements use PDO prepared statements and an authenticated owner UUID.
- The checked-in files contain no production database password or private API key.

## Documentation

- [`START-HERE.md`](START-HERE.md) — continuation and new-machine guide.
- [`CPANEL-DEPLOYMENT.md`](CPANEL-DEPLOYMENT.md) — isolated static/PHP deployment.
- [`REQUIREMENTS.md`](REQUIREMENTS.md) — runtime and service requirements.
- [`database/mysql/README.md`](database/mysql/README.md) — schema and data migration.
- [`TASKS.md`](TASKS.md) — migration status and release gates.
