# OakBoard Requirements

## Runtime

- Windows 10/11, macOS, or Linux for normal Node.js development.
- Node.js `24.18.0` (pinned in `.nvmrc`).
- npm `11.16.0` (pinned in `react-app/package.json`).
- A modern browser such as Microsoft Edge, Chrome, Firefox, or Safari.

Windows users without administrator access can run `scripts/setup.ps1`. It installs the pinned official Node.js ZIP under the current user's profile, verifies its SHA-256 checksum, installs exact npm dependencies, and runs the project checks.

## Frontend dependencies

Production dependencies are declared in `react-app/package.json`, and exact resolved versions are locked in `react-app/package-lock.json`:

- React and React DOM
- React Router
- Supabase JavaScript client
- html-to-image
- jsPDF

Development dependencies:

- TypeScript
- Vite and the React plugin
- Oxlint
- React, React DOM, and Node.js type definitions

Do not copy or commit `node_modules/` or `react-app/dist/`. Recreate them with `npm ci` and `npm run build`.

## Environment variables

Create `react-app/.env.local` from `react-app/.env.example`:

```env
VITE_SUPABASE_URL=https://avdwwlwxmnuqphxlpgrn.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

`react-app/.env.local` is ignored by Git. Never commit real environment values.

Supabase Edge Function secrets are documented in `supabase/functions/.env.example`:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPABASE_SERVICE_ROLE_KEY` (provided automatically by Supabase in deployed functions)

Never place server-side secrets in the React app or Vercel frontend variables.

## External services

- Supabase project for authentication and Edge Functions
- Resend account for email delivery
- Vercel account only when deployment is required

Account sign-in, production secrets, Supabase deployment, email-domain verification, and Vercel deployment are intentionally not automated by the local setup script.

## Standard setup

From the repository root on Windows without administrator access:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

With Node.js already installed:

```powershell
cd react-app
npm ci
npm run build
npm run lint
```

Start local development:

```powershell
cd react-app
npm run dev -- --host 127.0.0.1
```
