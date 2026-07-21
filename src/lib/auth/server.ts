import { redirect } from 'next/navigation'
import { SESSION_MAX_AGE_MS } from './constants'
import { supabaseEnvReady } from '@/lib/supabase/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function requireFreshSession() {
  if (!supabaseEnvReady) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  const issuedAt = Number(data?.claims?.iat ?? 0) * 1000

  if (error || !data?.claims?.sub || !issuedAt || Date.now() - issuedAt > SESSION_MAX_AGE_MS) {
    redirect('/login')
  }

  return data.claims
}
