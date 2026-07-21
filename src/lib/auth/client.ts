import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import {
  CURRENT_SESSION_VALUE,
  REMEMBER_SESSION_COOKIE,
  REMEMBER_SESSION_MAX_AGE_SECONDS,
  REMEMBER_SESSION_VALUE,
  SESSION_CHECK_TIMEOUT_MS,
  SESSION_MAX_AGE_MS,
} from './constants'

export type SessionCheck =
  | { ok: true; session: Session }
  | { ok: false; reason: 'missing' | 'expired' | 'timeout' | 'error'; message?: string }

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('Session check timed out')), timeoutMs)

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

function getSessionPreference() {
  const prefix = `${REMEMBER_SESSION_COOKIE}=`
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  return cookie?.slice(prefix.length) ?? null
}

function isSessionFresh(session: Session): boolean {
  const preference = getSessionPreference()
  if (preference === REMEMBER_SESSION_VALUE) return true
  if (preference !== CURRENT_SESSION_VALUE) return false

  const signedInAt = session.user.last_sign_in_at
    ? new Date(session.user.last_sign_in_at).getTime()
    : session.expires_at
      ? session.expires_at * 1000 - 60 * 60 * 1000
      : Date.now()

  return Date.now() - signedInAt <= SESSION_MAX_AGE_MS
}

export function setRememberSessionPreference(remember: boolean) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const persistence = remember ? `; Max-Age=${REMEMBER_SESSION_MAX_AGE_SECONDS}` : ''
  const value = remember ? REMEMBER_SESSION_VALUE : CURRENT_SESSION_VALUE

  document.cookie = `${REMEMBER_SESSION_COOKIE}=${value}; Path=/; SameSite=Lax${persistence}${secure}`
}

export function clearRememberSessionPreference() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${REMEMBER_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

export async function getValidSession(): Promise<SessionCheck> {
  try {
    if (!supabase) {
      return {
        ok: false,
        reason: 'error',
        message: 'Supabase environment variables are missing.',
      }
    }

    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      SESSION_CHECK_TIMEOUT_MS,
    )

    if (error) return { ok: false, reason: 'error', message: error.message }
    if (!data.session) return { ok: false, reason: 'missing' }
    if (!isSessionFresh(data.session)) return { ok: false, reason: 'expired' }

    return { ok: true, session: data.session }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown session error'
    return {
      ok: false,
      reason: message.includes('timed out') ? 'timeout' : 'error',
      message,
    }
  }
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
  clearRememberSessionPreference()
  localStorage.removeItem('obf_plan_data')
  sessionStorage.removeItem('obf_plan_data')
}

export async function invokeAuthenticatedFunction<
  TPayload extends Record<string, unknown>,
  TResult,
>(name: string, payload: TPayload): Promise<TResult> {
  const sessionResult = await getValidSession()
  if (!sessionResult.ok) throw new Error('Please sign in again to continue.')
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.functions.invoke<TResult>(name, { body: payload })
  if (error) throw new Error(error.message || 'Edge Function returned an error.')
  if (!data) throw new Error('No response returned from Edge Function.')

  return data
}
