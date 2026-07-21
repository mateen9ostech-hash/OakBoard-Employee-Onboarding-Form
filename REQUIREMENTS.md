# OakBoard Requirements

## Runtime

- Windows 10/11, macOS, or Linux for normal Node.js development.
- Node.js `24.18.0` (pinned in `.nvmrc`).
- npm `11.16.0` (pinned in the root `package.json`).
- A modern browser such as Microsoft Edge, Chrome, Firefox, or Safari.

Windows users without administrator access can run `scripts/setup.ps1`. It installs the pinned official Node.js ZIP under the current user's profile, verifies its SHA-256 checksum, installs exact npm dependencies, and runs the project checks.

## Frontend dependencies

Production dependencies are declared in the root `package.json`, and exact resolved versions are locked in `package-lock.json`:

- React and React DOM
- Next.js App Router
- Supabase JavaScript and SSR clients
- html-to-image
- jsPDF

Development dependencies:

- TypeScript
- Next.js ESLint configuration
- React, React DOM, and Node.js type definitions

Do not copy or commit `node_modules/` or `.next/`. Recreate them with `npm ci` and `npm run build`.

## Environment variables

Create root `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

`.env.local` is ignored by Git. Never commit real environment values.

Supabase Edge Function secrets are documented in `supabase/functions/.env.example`:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPABASE_SERVICE_ROLE_KEY` (provided automatically by Supabase in deployed functions)

Never place server-side secrets in browser-exposed `NEXT_PUBLIC_*` variables.

## External services

- Supabase project for authentication and Edge Functions
- Resend account for email delivery
- Vercel account only when deployment is required

Account sign-in, production secrets, Supabase deployment, email-domain verification, and Vercel deployment are intentionally not automated by the local setup script.

Supabase Authentication URL Configuration must allow `/auth/callback` for every active local or production origin. See `NEXTJS-CUTOVER.md` for the exact cutover gates.

## Standard setup

From the repository root on Windows without administrator access:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

With Node.js already installed:

```powershell
npm ci
npm run build
npm run lint
npm run typecheck
npm audit
```

Start local development:

```powershell
npm run dev -- --hostname 127.0.0.1
```
