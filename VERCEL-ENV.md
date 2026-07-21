# Vercel Environment Variables

Production app: <https://oak-board-employee-onboarding-form.vercel.app>

Vercel project: `9ostech/oak-board-employee-onboarding-form`

Add these public variables in Vercel for the Next.js frontend:

Apply them to the environments you intend to use (Preview and/or Production), then trigger a new build.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Do not add server-side secrets to the Next.js/Vercel frontend:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
Those belong in Supabase Edge Function secrets only.

## Build settings

If Vercel asks for manual settings:

- Framework: Next.js
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: leave at the Next.js default

## Deploy from a new laptop

After validation and Vercel login:

```powershell
npx vercel@latest link
npx vercel@latest deploy --prod
```

The local `.vercel/` link and Vercel-issued OIDC token are ignored by Git and must be recreated on each machine.
