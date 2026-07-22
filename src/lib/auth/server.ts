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

export type AuthenticatedOwner = {
  id: string
  email: string
  fullName: string
}

export async function getFreshSessionClaims() {
  if (!supabaseEnvReady) return null

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
    return null
  }

  return data.claims
}

export async function getAuthenticatedOwner(): Promise<AuthenticatedOwner | null> {
  const claims = await getFreshSessionClaims()
  if (!claims || typeof claims.sub !== 'string') return null

  const metadata = claims.user_metadata && typeof claims.user_metadata === 'object'
    ? claims.user_metadata as Record<string, unknown>
    : {}
  const fullName = [metadata.full_name, metadata.name, metadata.display_name]
    .find((value) => typeof value === 'string' && value.trim())

  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '',
    fullName: typeof fullName === 'string' ? fullName.trim() : '',
  }
}

export async function requireFreshSession() {
  const claims = await getFreshSessionClaims()
  if (!claims) redirect('/sign-in')
  return claims
}
