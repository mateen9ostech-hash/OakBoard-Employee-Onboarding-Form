# OakBoard Employee Onboarding Form

This is the canonical OakBoard employee onboarding project.

## Merge baseline

- `Login.html`: recovered Login UI, cleaned to remove the accidentally appended pages.
- `FillDetails.html`: recovered form UI and workflow.
- `GenerateForm.html`: recovered result-page UI and functionality baseline.
- `auth-guard.js`: current project's timeout-protected session handling.
- `Assets/` and `index.html`: copied from the current project.

The recovered UI and workflow are merged with the stabilized authentication implementation.

## Authentication integration

- All pages load one shared Supabase client from `auth-guard.js`.
- Session checks have a 10-second timeout and always dismiss the auth loader.
- Login redirects authenticated users without creating a second client.
- FillDetails and GenerateForm use `requireAuth()`.
- Sign-out uses the shared cleanup and redirect flow.
- Supabase's browser SDK is bundled under `Assets/` so a stalled CDN request cannot freeze the verification screen before the timeout starts.
- GenerateForm has an independent 12-second fail-safe redirect, so an unexpected script failure cannot leave the verification overlay spinning forever.

## Secure email delivery

- The recovered email modal and formatted email template are preserved.
- The Resend API key is no longer present in browser code.
- `GenerateForm.html` calls the authenticated `send-onboarding-email` Supabase Edge Function.
- The function permits authenticated `@9ostech.com` users, validates the payload, and reads `RESEND_API_KEY` only from server-side environment secrets.
- Deployment and secret configuration are intentionally not performed from this workspace.
