# OakBoard — Read This First

Last updated: 2026-07-22

## Branch status

- Stable production source: `main` (legacy hosted application)
- Active cPanel migration: `migration/react-php-mysql`
- Target: static Vite/React frontend + PHP API + cPanel MySQL

Do not merge this migration branch into `main` or replace production until every release gate in `TASKS.md` passes.

## New-machine setup

```powershell
cd C:\Projects\Coding
git clone https://github.com/mateen9ostech-hash/OakBoard-Employee-Onboarding-Form.git
cd .\OakBoard-Employee-Onboarding-Form
git switch migration/react-php-mysql
npm ci
Copy-Item .env.example .env.local
```

Set only the public Supabase values in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_API_BASE_URL=/api
VITE_SITE_URL=http://127.0.0.1:3000
```

Never put MySQL or Resend passwords in the Vite environment.

## Validate the frontend

```powershell
npm run typecheck
npm run lint
npm run build
npm audit
npm run dev
```

The Vite dev server runs at <http://127.0.0.1:3000>. For full local CRUD testing, install PHP 8.1+ and run `npm run dev:api` in a second terminal with `OAKBOARD_CONFIG_FILE` pointing to a private local PHP configuration.

## External setup still required

1. Import `database/mysql/schema.sql` into the cPanel database.
2. Create `/home/ostech/oakboard-config.php` from `api/config.example.php` using rotated private credentials.
3. Confirm PHP extensions `pdo_mysql`, `curl`, `mbstring`, and `json` are enabled for this subdomain.
4. Add `https://onboarding.9ostech.com/auth/callback` to Supabase Auth redirect URLs.
5. Deploy only `dist/` by following `CPANEL-DEPLOYMENT.md`.
6. Run authenticated user-isolation, archive/restore/delete, PDF, and email acceptance tests.

## Normal workflow

```powershell
git status
git pull --ff-only origin migration/react-php-mysql
npm ci
npm run typecheck
npm run lint
npm run build
```

Never commit `.env.local`, `/home/.../oakboard-config.php`, raw database exports, `node_modules`, or `dist`.
