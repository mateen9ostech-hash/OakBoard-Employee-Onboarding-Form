const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '/api'

export type AuthUser = {
  id: string
  email?: string
  email_confirmed_at?: string | null
  last_sign_in_at?: string | null
  user_metadata: {
    full_name?: string
    name?: string
    display_name?: string
  }
}

export type AuthSession = {
  user: AuthUser
  expires_at: number
}

export type AuthFailure = {
  code?: string
  message: string
  status?: number
}

export type SessionCheck =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: 'missing' | 'expired' | 'timeout' | 'error'; message?: string }

type AuthResult<T> = {
  data: T | null
  error: AuthFailure | null
}

function resolveAuthUrl(path: string) {
  return `${configuredBaseUrl}/auth/${path}`
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<AuthResult<T>> {
  try {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body) headers.set('Content-Type', 'application/json')

    const response = await fetch(resolveAuthUrl(path), {
      ...init,
      credentials: 'same-origin',
      headers,
    })
    const payload = await response.json().catch(() => null) as (T & { error?: string; code?: string }) | null
    if (!response.ok) {
      return {
        data: null,
        error: {
          code: payload?.code,
          message: payload?.error || 'OakBoard could not complete this account request.',
          status: response.status,
        },
      }
    }
    return { data: payload, error: null }
  } catch (caught) {
    return {
      data: null,
      error: {
        code: 'network_error',
        message: caught instanceof Error ? caught.message : 'The OakBoard server could not be reached.',
      },
    }
  }
}

export async function getValidSession(): Promise<SessionCheck> {
  const result = await authRequest<{ session: AuthSession }>('session', { cache: 'no-store' })
  if (result.error || !result.data?.session) {
    return {
      ok: false,
      reason: result.error?.status === 401 ? 'missing' : 'error',
      message: result.error?.message,
    }
  }
  if (result.data.session.expires_at * 1000 <= Date.now()) {
    return { ok: false, reason: 'expired' }
  }
  return { ok: true, session: result.data.session }
}

export function signInWithPassword(email: string, password: string, remember: boolean) {
  return authRequest<{ session: AuthSession; user: AuthUser }>('signin', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember }),
  })
}

export function signUpWithPassword(email: string, password: string, fullName: string) {
  return authRequest<{ user: AuthUser; verification_required: boolean }>('signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName }),
  })
}

export function verifySignupOtp(email: string, code: string) {
  return authRequest<{ session: AuthSession; user: AuthUser }>('verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
}

export function resendSignupOtp(email: string) {
  return authRequest<{ ok: boolean }>('resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function requestPasswordReset(email: string) {
  return authRequest<{ ok: boolean }>('password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function confirmPasswordReset(token: string, password: string) {
  return authRequest<{ session: AuthSession; user: AuthUser }>('password-reset-confirm', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export async function signOut() {
  const csrf = readCookie('oakboard_csrf')
  await authRequest<{ ok: boolean }>('signout', {
    method: 'POST',
    headers: csrf ? { 'X-CSRF-Token': csrf } : undefined,
  })
  localStorage.removeItem('obf_plan_data')
  sessionStorage.removeItem('obf_plan_data')
}

export function readCookie(name: string) {
  const prefix = `${name}=`
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? ''
}
