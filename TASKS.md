# OakBoard Project Status

Last updated: 2026-07-22

This is the current release checklist for the canonical Next.js application. Historical Vite and static HTML migration tasks have been removed because those implementations are no longer part of the repository.

## Current state

- [x] Next.js 16 App Router is the canonical root application.
- [x] The Vite, React Router, and legacy static HTML implementations are removed.
- [x] Supabase authentication uses SSR cookies and a Next.js proxy with a 15-minute session-freshness rule.
- [x] Sign-in, signup, signout, protected routes, and authenticated plan access are implemented.
- [x] Professional App Router URLs separate public, auth, workspace, plan creation, archive, preview, and edit concerns.
- [x] The plan builder supports 2-week and 4-week onboarding plans.
- [x] NotebookLM text import runs locally in the browser.
- [x] Recent plans are owner-scoped in Supabase and support preview, edit, archive, restore, and delete actions.
- [x] Preview, print, PDF export, and authenticated email delivery are implemented.
- [x] Supabase database migrations and the `send-onboarding-email` Edge Function are retained.
- [x] OakBoard branding and browser metadata are configured.
- [x] Portable no-UAC Node.js setup, pinned dependencies, and environment templates are documented.
- [x] TypeScript, ESLint, and the production build pass locally.
- [x] The private GitHub `main` branch is the source of truth.
- [x] Vercel Production and Preview contain the required public Supabase variables.
- [x] The production Next.js application is deployed at `https://ostonboarding.vercel.app`.
- [x] A `START-HERE.md` handoff guide documents completed work and new-laptop setup.

## External release tasks

These require an external service change or explicit deployment approval:

- [ ] Confirm the local and production callback URLs in Supabase Auth settings.
- [ ] Run an optional live acceptance test for NotebookLM import and email delivery.
- [ ] Run a production sign-in/signup callback acceptance test.
- [ ] Upgrade the inherited `sharp` dependency when Next.js provides a compatible fix for the current advisory.

## Standard validation

Run from the repository root:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
npm audit
```

For local development:

```powershell
npm run dev -- --hostname 127.0.0.1
```

See `README.md`, `REQUIREMENTS.md`, `NEXTJS-CUTOVER.md`, and `VERCEL-ENV.md` for setup and release details.
