# OakBoard Employee Onboarding Plans

> Start with [`START-HERE.md`](START-HERE.md) on a new computer.

OakBoard creates, stores, previews, exports, and emails role-specific onboarding plans.

## Architecture

```text
React + TypeScript SPA
  -> same-origin PHP 8 REST API
  -> cPanel MySQL / MariaDB
  -> Mailgun for OTP, recovery, and PDF email
```

Authentication is owned by OakBoard: password hashes, OTPs, reset tokens, sessions, and plans are stored in MySQL. Session cookies are HTTP-only, mutations require a CSRF token, and every plan query is scoped to the signed-in user.

## Routes

| URL | Purpose |
| --- | --- |
| `/` | Public product page |
| `/sign-in` | Sign in, signup, OTP, and recovery |
| `/workspace` | Authenticated dashboard |
| `/plans/new` | New-plan workflow |
| `/plans/archived` | Archived plans |
| `/plans/{id}` | Owner-scoped preview and export |
| `/plans/{id}/edit` | Owner-scoped plan editor |

## Local development

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
npm run dev
```

Open <http://127.0.0.1:3000/sign-in>.

For full local API testing, create a private PHP configuration outside the repository and start `npm run dev:api` in a second terminal. See [`CPANEL-DEPLOYMENT.md`](CPANEL-DEPLOYMENT.md).

## Build output

`npm run build` creates `dist/` containing the static React application, route fallback configuration, and the PHP API under `dist/api/`. Deploy only the contents of `dist/`; Passenger and a persistent Node.js server are not required.

## Security boundaries

- MySQL credentials go in `/home/CPANEL_USER/oakboard-config.php`, outside `public_html`.
- Mailgun and session secrets stay in the same private PHP configuration.
- Plan CRUD uses PDO prepared statements and an authenticated owner UUID.
- The checked-in files contain no production database password or private API key.

## Documentation

- [`START-HERE.md`](START-HERE.md) — continuation and new-machine guide.
- [`CPANEL-DEPLOYMENT.md`](CPANEL-DEPLOYMENT.md) — isolated static/PHP deployment.
- [`REQUIREMENTS.md`](REQUIREMENTS.md) — runtime and service requirements.
- [`database/mysql/README.md`](database/mysql/README.md) — schema and database setup.
- [`TASKS.md`](TASKS.md) — migration status and release gates.
