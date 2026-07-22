import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import {
  CURRENT_SESSION_VALUE,
  REMEMBER_SESSION_COOKIE,
  REMEMBER_SESSION_VALUE,
  SESSION_MAX_AGE_MS,
} from './constants'
import { supabaseEnvReady } from '@/lib/supabase/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function requireFreshSession() {
  if (!supabaseEnvReady) redirect('/sign-in')

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  const issuedAt = Number(data?.claims?.iat ?? 0) * 1000
  const cookieStore = await cookies()
  const sessionPreference = cookieStore.get(REMEMBER_SESSION_COOKIE)?.value
  const remembered = sessionPreference === REMEMBER_SESSION_VALUE
  const currentSessionIsFresh =
    sessionPreference === CURRENT_SESSION_VALUE &&
    Boolean(issuedAt) &&
    Date.now() - issuedAt <= SESSION_MAX_AGE_MS

  if (error || !data?.claims?.sub || (!remembered && !currentSessionIsFresh)) {
    redirect('/sign-in')
  }

  return data.claims
}
