import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const SESSION_MAX_AGE_MS = 2 * 60 * 1000
export const SESSION_CHECK_TIMEOUT_MS = 10_000

export type SessionCheck =
  | { ok: true; session: Session }
  | { ok: false; reason: 'missing' | 'expired' | 'timeout' | 'error'; message?: string }

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Session check timed out'))
    }, timeoutMs)

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

export function isSessionFresh(session: Session): boolean {
  const createdAt = session.user?.last_sign_in_at
    ? new Date(session.user.last_sign_in_at).getTime()
    : session.expires_at
      ? session.expires_at * 1000 - 60 * 60 * 1000
      : Date.now()

  return Date.now() - createdAt <= SESSION_MAX_AGE_MS
}

export async function getValidSession(): Promise<SessionCheck> {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      SESSION_CHECK_TIMEOUT_MS,
    )

    if (error) {
      return { ok: false, reason: 'error', message: error.message }
    }

    if (!data.session) {
      return { ok: false, reason: 'missing' }
    }

    if (!isSessionFresh(data.session)) {
      return { ok: false, reason: 'expired' }
    }

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
  await supabase.auth.signOut()
  localStorage.removeItem('obf_plan_data')
  sessionStorage.removeItem('obf_plan_data')
}

export async function invokeAuthenticatedFunction<
  TPayload extends Record<string, unknown>,
  TResult,
>(
  name: string,
  payload: TPayload,
): Promise<TResult> {
  const sessionResult = await getValidSession()

  if (!sessionResult.ok) {
    throw new Error('Your session is no longer valid.')
  }

  const { data, error } = await supabase.functions.invoke<TResult>(name, {
    body: payload,
  })

  if (error) {
    throw new Error(error.message || 'Edge Function returned an error.')
  }

  if (!data) {
    throw new Error('No response returned from Edge Function.')
  }

  return data
}
