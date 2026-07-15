# Vercel Environment Variables

Add these variables in Vercel for the React frontend:

```env
VITE_SUPABASE_URL=https://avdwwlwxmnuqphxlpgrn.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

Do not add server-side secrets to the React/Vercel frontend:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `OLLAMA_API_KEY`

Those belong in Supabase Edge Function secrets only.

## Build settings

If Vercel asks for manual settings:

- Framework: Vite
- Install command: `cd react-app && npm ci`
- Build command: `cd react-app && npm run build`
- Output directory: `react-app/dist`

