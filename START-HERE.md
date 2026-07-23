# OakBoard — Read This First

Last updated: 2026-07-23

## Branch status

- Stable production source: `main`
- Active cPanel migration: `migration/react-php-mysql`
- Target: Vite/React frontend + PHP API + cPanel MySQL + Mailgun

Do not merge this migration branch into `main` until every release gate in `TASKS.md` passes.

## New-machine setup

```powershell
cd "C:\Users\Mateen\OneDrive - Oak Street Technologies\M. Mateen Shahid Files - Design Team\Projects\Coding"
git clone https://github.com/mateen9ostech-hash/OakBoard-Employee-Onboarding-Form.git
cd .\OakBoard-Employee-Onboarding-Form
git switch migration/react-php-mysql
npm ci
```

The app defaults to same-origin `/api`. `.env.local` is optional and may contain browser-public overrides only:

```env
VITE_API_BASE_URL=/api
VITE_SITE_URL=http://127.0.0.1:3000
```

Never put MySQL, Mailgun, or session secrets in a Vite environment file.

## Validate

```powershell
npm run php:check
npm run typecheck
npm run lint
npm run build
npm audit
```

Run `npm run dev` for the frontend. Full local authentication and CRUD also require `npm run dev:api`, a private PHP configuration, and a reachable MySQL database.

## Production setup

1. Import `database/mysql/schema.sql` into the cPanel database.
2. Create `/home/ostech/oakboard-config.php` from `api/config.example.php` with rotated private credentials.
3. Confirm PHP extensions `pdo_mysql`, `curl`, `mbstring`, `json`, and `openssl`.
4. Add Mailgun settings and a random session secret to the private config.
5. Deploy only `dist/` by following `CPANEL-DEPLOYMENT.md`.
6. Test signup OTP, recovery, user isolation, CRUD, PDF download, and PDF email.

Never commit `.env.local`, private PHP configuration, database exports, `node_modules`, or `dist`.
