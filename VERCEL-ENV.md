# Vercel Environment Variables

Add these public variables in Vercel for the Next.js frontend:

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
