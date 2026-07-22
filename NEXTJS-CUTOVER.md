# Next.js Cutover Runbook

This runbook records the release gates for the completed local cutover to the root Next.js App Router application.

## Preserved application behavior

| Capability | Next.js implementation |
|---|---|
| Login, signup, and sign-out | `src/app/(auth)/sign-in/page.tsx` and `src/lib/auth/client.ts` |
| Cookie refresh and verified protected routes | `src/proxy.ts`, `src/lib/supabase/`, and `src/app/(protected)/layout.tsx` |
| Email confirmation callback | `src/app/(auth)/auth/callback/route.ts` |
| Workspace, plan creation, editing, and NotebookLM import | `src/components/workspace-client.tsx` with routes under `src/app/(protected)/` |
| User-owned plan persistence and history | Supabase `onboarding_plans`, enforced by owner-scoped queries |
| Preview, print, and PDF download | `src/app/(protected)/plans/[planId]/` |
| Authenticated email delivery | Existing `send-onboarding-email` Supabase Edge Function |

## Pre-cutover gates

- [x] Next.js root dependencies have an exact npm lockfile.
- [x] `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- [ ] Resolve the current upstream `sharp` advisory inherited through Next.js when a compatible fixed release is available.
- [x] The no-administrator Windows setup script installs and verifies the root app.
- [x] Unauthenticated route and redirect smoke tests pass.
- [x] Unknown routes render a dedicated 404 page instead of redirecting into the application.
- [x] Browser metadata displays the OakBoard logo with no inherited Vite favicon.
- [x] Root `.env.local` contains the two public Supabase variables from `.env.example` and remains Git-ignored.
- [x] The configured Supabase Auth health endpoint responds successfully.
- [x] Real Supabase sign-in, JWT claim verification, and authenticated `/workspace` rendering pass.
- [x] The migrated Generate preview and PDF download pass an authenticated browser check.
- [x] A generated plan reloads from the authenticated user's Supabase-backed Recent Plans history.
- [x] The deployed email Edge Function responds successfully to the Next.js origin preflight.
- [x] NotebookLM parsing and the authenticated email invocation path are preserved in the migrated source and compile successfully.
- [x] The temporary `react-app/` fallback was removed after explicit deletion approval.
- [x] Redundant exports were removed and generated Next.js type declarations are ignored and regenerated during typecheck.
- [x] The migration is reviewed, committed, and pushed to the private repository after explicit Git approval.
- [x] Public Supabase configuration is added to Vercel Production and Preview.
- [x] The production deployment is live at `https://oak-board-employee-onboarding-form.vercel.app`.

## External release gates

These actions are intentionally outside the completed local code migration:

- [ ] Add the approved local and production `/auth/callback` URLs in Supabase Auth settings.
- [ ] Perform another live NotebookLM import and email-delivery acceptance test if requested.
- [x] Deploy to production only after separate explicit deployment approval.

## Supabase URL configuration

Before signup confirmation is enabled for an environment, add its callback URL in Supabase Authentication URL Configuration:

```text
http://127.0.0.1:3000/auth/callback
https://oak-board-employee-onboarding-form.vercel.app/auth/callback
```

Use the actual production domain when deployment is approved. Do not place `RESEND_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in Next.js public environment variables.

## Local verification

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
npm run dev -- --hostname 127.0.0.1
```

Verify this sequence in the browser:

1. Sign in with an approved `@9ostech.com` account.
2. Create a two-week plan and reload it from Recent Plans.
3. Import a structured NotebookLM plan and verify its duration and fields.
4. Generate the preview and download the PDF.
5. Send the demo email to the permitted recipient.
6. Sign out and confirm protected routes return to `/sign-in`.

## Rollback

After an approved migration commit, rollback means reverting that commit and rebuilding the previous private-repository revision. Do not rewrite Git history or force-push.
