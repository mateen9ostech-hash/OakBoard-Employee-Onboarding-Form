import { supabase } from '@/lib/supabase/client'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '/api'

function resolveApiUrl(input: RequestInfo | URL) {
  if (typeof input !== 'string' || !input.startsWith('/api')) return input
  return `${configuredBaseUrl}${input.slice(4)}`
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } }

  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }
  headers.set('Accept', 'application/json')

  return fetch(resolveApiUrl(input), {
    ...init,
    headers,
    credentials: 'same-origin',
  })
}
