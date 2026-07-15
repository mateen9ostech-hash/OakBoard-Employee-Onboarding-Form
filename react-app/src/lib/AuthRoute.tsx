import { type ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getValidSession } from './auth'

type AuthState = 'checking' | 'valid' | 'invalid'

export function AuthRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('checking')
  const location = useLocation()

  useEffect(() => {
    let active = true

    getValidSession().then((result) => {
      if (!active) return
      setState(result.ok ? 'valid' : 'invalid')
    })

    return () => {
      active = false
    }
  }, [location.pathname])

  if (state === 'checking') {
    return (
      <main className="auth-loader" aria-live="polite">
        <span className="auth-loader__spinner" aria-hidden="true" />
        <p>Verifying session...</p>
      </main>
    )
  }

  if (state === 'invalid') {
    return <Navigate to="/login?reason=session-timeout" replace />
  }

  return <>{children}</>
}
