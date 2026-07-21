# OakBoard Employee Onboarding Form

This is the canonical OakBoard employee onboarding project.

The production application is the React + TypeScript + Vite project in `react-app/`.
The previous root-level static HTML application was removed after the React migration and end-to-end flow were verified.

## Local development

For a complete dependency and service inventory, see `REQUIREMENTS.md`.

On Windows without administrator access, run the verified portable setup from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

If the pinned Node.js and npm versions are already available:

```powershell
cd react-app
npm ci
npm run dev
```

Validation commands:

```powershell
npm run build
npm run lint
```

## Authentication integration

- React uses the shared Supabase client in `react-app/src/lib/supabase.ts`.
- Protected routes use the React authentication guard in `react-app/src/lib/AuthRoute.tsx`.
- Login, session freshness, sign-out, and protected-route redirects are handled by the React app.

## Secure email delivery

- The email body stays compact and the complete plan is attached as a 1920 x 1080 (16:9) landscape PDF matching the supplied reference.
- PDF generation uses installed React dependencies, so it does not depend on a CDN.
- The Resend API key is no longer present in browser code.
- The React Generate Form page calls the authenticated `send-onboarding-email` Supabase Edge Function.
- The function permits authenticated `@9ostech.com` users, validates the payload, and reads `RESEND_API_KEY` only from server-side environment secrets.
- Deployment and secret configuration are intentionally not performed from this workspace.

## Environment configuration

- Copy `react-app/.env.example` to `react-app/.env.local` for local React development.
- Configure the server-side variables listed in `supabase/functions/.env.example` as Supabase Edge Function secrets.
- Never place `RESEND_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in the React app or Vercel frontend variables.
- Do not copy `.env.local`, `node_modules/`, or `dist/` between machines; recreate them from the templates and lockfile.

## Demo Mode

- Until a custom sending domain is verified, email delivery is locked to `mateen9ostech@gmail.com`.
- CC is disabled in the browser and rejected by the Edge Function.
- The restriction is enforced in both the UI and server-side function, so it cannot be bypassed by editing the form.

## Document output

- The React Generate Form page uses a responsive 16:9 landscape canvas matching the supplied 1920 x 1080 reference.
- The clean PDF button captures the exact visible preview as a high-resolution PNG and places it edge-to-edge on one borderless 16:9 PDF page, avoiding browser headers and layout reflow.
- Two-week plans render and export on one 16:9 page; four-week plans are split into two 16:9 pages with two weeks per page.
- Fill Sample Plan respects the currently selected two-week or four-week duration.
