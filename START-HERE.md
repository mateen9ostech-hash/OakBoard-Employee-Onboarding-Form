# OakBoard — Read This First

Last updated: 2026-07-22

This is the handoff document for continuing OakBoard development on this or a new laptop.

## Current links

- Production app: <https://oak-board-employee-onboarding-form.vercel.app>
- Private GitHub repository: <https://github.com/mateen9ostech-hash/OakBoard-Employee-Onboarding-Form>
- Vercel project: `9ostech/oak-board-employee-onboarding-form`
- Main development branch: `main`

## Current project state

OakBoard is a production-deployed Next.js 16 App Router application. The old static HTML, React Router, and Vite implementations were removed after migration and are not required.

Completed work:

- Migrated the application to Next.js 16, React 19, and TypeScript.
- Added Supabase SSR/cookie authentication with protected routes and a 15-minute session-freshness rule.
- Implemented login, signup, email callback, signout, and authenticated redirects.
- Added 6-digit email OTP verification for new accounts, automatic sign-in after verification, and rate-limited code resending.
- Migrated the Fill Details and Generate Form workflows.
- Added 2-week and 4-week onboarding-plan support.
- Added local NotebookLM text import and duration detection.
- Added user-owned Recent Plans, archive, restore, preview, and edit routes backed by Supabase.
- Preserved the 16:9 onboarding preview, print flow, and high-resolution PDF export.
- Preserved authenticated email delivery through the Supabase `send-onboarding-email` Edge Function.
- Kept Resend and Supabase service-role secrets outside browser code.
- Added OakBoard branding and removed inherited Vite assets.
- Removed obsolete code, duplicate exports, generated artifacts, and migration fallback files.
- Added exact dependency locking, TypeScript, ESLint, build, and audit validation.
- Added a no-administrator Windows Node.js setup script.
- Configured Vercel Production and Preview with the public Supabase variables.
- Deployed the production application to Vercel.

## New laptop setup

### 1. Install Git and clone the private repository

Sign in to the GitHub account that has access to the private repository, then run:

```powershell
cd C:\Projects\Coding
git clone https://github.com/mateen9ostech-hash/OakBoard-Employee-Onboarding-Form.git
cd .\OakBoard-Employee-Onboarding-Form
```

If GitHub asks for authentication, use Git Credential Manager or GitHub CLI. Do not place a password or token in the repository.

### 2. Install Node.js and dependencies

On Windows without administrator/UAC access, run the included portable setup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

It installs the pinned Node.js version under the current Windows user profile, adds it to the user PATH, runs `npm ci`, and validates the project.

If Node.js is already installed, verify it and install exact dependencies:

```powershell
node --version
npm --version
npm ci
```

The preferred local versions are recorded in `.nvmrc` and `package.json`.

### 3. Create the local environment file

Create `.env.local` from the safe template:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` in VS Code and replace the placeholders with the Supabase project URL and publishable key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

`.env.local` is Git-ignored. Never commit it. Never place `RESEND_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in this frontend file.

### 4. Validate and run

```powershell
npm run typecheck
npm run lint
npm run build
npm audit
npm run dev -- --hostname 127.0.0.1
```

Open <http://127.0.0.1:3000/sign-in>.

### 5. Confirm external configuration

Supabase Authentication URL Configuration should allow:

```text
http://127.0.0.1:3000/auth/callback
https://oak-board-employee-onboarding-form.vercel.app/auth/callback
```

The Supabase Edge Function owns the Resend and service-role secrets. Those secrets do not belong in Vercel or `.env.local`.

Supabase signup verification must also be configured as follows:

- Keep **Authentication > Providers > Email > Confirm email** enabled.
- In **Authentication > Email Templates > Confirm signup**, include `{{ .Token }}` so the email contains the 6-digit OTP used by the app.
- Keep the production and local callback URLs listed above in the redirect allow list for recovery and fallback email-link flows.

## Normal development workflow

Before starting work:

```powershell
git switch main
git pull --ff-only origin main
npm ci
```

After making changes:

```powershell
npm run typecheck
npm run lint
npm run build
npm audit
git status
```

Review changes before committing. Never commit `.env.local`, `.vercel/`, `node_modules/`, or `.next/`.

## Deployment workflow

The repository is linked locally to the Vercel project, but `.vercel/` is intentionally ignored. A new laptop can install/use the CLI and relink it:

```powershell
npx vercel@latest login
npx vercel@latest link
npx vercel@latest deploy --prod
```

Deploy only after the validation commands pass. The required Vercel variables are listed in `VERCEL-ENV.md`.

## Remaining external checks

- Confirm the production callback URL in Supabase Auth settings.
- Confirm the signup email template contains `{{ .Token }}` and perform a production signup/OTP test.
- Optionally run a complete live NotebookLM import, PDF, Recent Plans, and demo-email acceptance test.
- Verify a custom Resend sending domain before removing demo-recipient restrictions.

## Documentation map

- `README.md` — project overview and architecture.
- `START-HERE.md` — new-machine setup and continuation guide.
- `TASKS.md` — current completion and remaining-work checklist.
- `REQUIREMENTS.md` — dependencies, runtimes, and external services.
- `NEXTJS-CUTOVER.md` — migration gates, verification, and rollback.
- `VERCEL-ENV.md` — Vercel environment and deployment configuration.
- `AGENTS.md` — repository-specific Git and safety workflow.
