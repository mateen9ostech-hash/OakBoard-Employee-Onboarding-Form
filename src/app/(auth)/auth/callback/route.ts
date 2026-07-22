import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { CURRENT_SESSION_VALUE, REMEMBER_SESSION_COOKIE } from '@/lib/auth/constants'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseEnvReady } from '@/lib/supabase/env'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedNext = requestUrl.searchParams.get('next')
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/workspace'

  if (code && supabaseEnvReady) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const cookieStore = await cookies()
      cookieStore.set(REMEMBER_SESSION_COOKIE, CURRENT_SESSION_VALUE, {
        path: '/',
        sameSite: 'lax',
        secure: requestUrl.protocol === 'https:',
      })
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/sign-in?auth_error=callback', requestUrl.origin))
}
