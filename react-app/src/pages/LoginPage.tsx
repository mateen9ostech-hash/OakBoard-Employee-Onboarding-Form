import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getValidSession } from '../lib/auth'
import { supabase, supabaseEnvReady } from '../lib/supabase'

type AuthTab = 'signin' | 'signup' | 'pending'
type PasswordVisibility = {
  signin: boolean
  signup: boolean
  confirm: boolean
}

const orgDomain = '@9ostech.com'

function isOrgEmail(email: string) {
  return email.trim().toLowerCase().endsWith(orgDomain)
}

function getPasswordScore(password: string) {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return Math.min(score, 4)
}

function formatAuthError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox.'
  }
  if (lower.includes('invalid login') || lower.includes('invalid')) {
    return 'Incorrect email or password.'
  }
  if (lower.includes('already registered')) {
    return 'This email is already registered. Try signing in instead.'
  }
  return message
}

function FieldIcon({ type }: { type: 'email' | 'lock' | 'user' }) {
  if (type === 'email') {
    return (
      <svg className="auth-input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
        <path d="M1.5 5.5l6.5 4 6.5-4" />
      </svg>
    )
  }

  if (type === 'user') {
    return (
      <svg className="auth-input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="8" cy="5.5" r="2.5" />
        <path d="M2.5 13s0-4 5.5-4 5.5 4 5.5 4" />
      </svg>
    )
  }

  return (
    <svg className="auth-input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" />
    </svg>
  )
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4z" />
      {hidden ? <circle cx="8" cy="8" r="1.8" /> : <line x1="1.5" y1="1.5" x2="14.5" y2="14.5" />}
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="5.5" />
      <path d="M7 4.5v3M7 9.5h.01" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 7l3 3 6-6" />
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<AuthTab>('signin')
  const [signinEmail, setSigninEmail] = useState('')
  const [signinPassword, setSigninPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [visible, setVisible] = useState<PasswordVisibility>({
    signin: false,
    signup: false,
    confirm: false,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [signinError, setSigninError] = useState<string | null>(
    searchParams.get('reason') === 'session-timeout'
      ? 'Your session is no longer valid. Please sign in again.'
      : null,
  )
  const [signinOk, setSigninOk] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'signin' | 'signup' | 'forgot' | null>(null)

  const passwordStrength = useMemo(() => {
    if (!signupPassword) return null
    const levels = [
      { width: '20%', color: '#e05555', label: 'Very weak' },
      { width: '40%', color: '#e07530', label: 'Weak' },
      { width: '60%', color: '#d4a017', label: 'Fair' },
      { width: '80%', color: '#2f9e44', label: 'Strong' },
      { width: '100%', color: '#24B34B', label: 'Very strong' },
    ]
    return levels[getPasswordScore(signupPassword)]
  }, [signupPassword])

  useEffect(() => {
    let active = true
    getValidSession().then((result) => {
      if (active && result.ok) {
        navigate('/fill-details', { replace: true })
      }
    })
    return () => {
      active = false
    }
  }, [navigate])

  if (!supabaseEnvReady || !supabase) {
    return (
      <main className="auth-wrap">
        <section className="auth-card">
          <div className="auth-card-hdr">
            <div className="auth-logo-wrap">
              <img src="/oakboard-logo.svg" alt="Oak Street Technologies" />
            </div>
            <div className="auth-title">Setup Required</div>
            <div className="auth-sub">Supabase environment variables are missing.</div>
          </div>
          <div className="auth-body">
            <div className="banner-err show">
              <AlertIcon />
              <span>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>react-app/.env.local</code>, then restart Vite.</span>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const supabaseClient = supabase

  function clearErrors() {
    setFieldErrors({})
    setSigninError(null)
    setSigninOk(null)
    setSignupError(null)
  }

  function switchTab(nextTab: AuthTab) {
    clearErrors()
    setTab(nextTab)
  }

  function toggleVisibility(key: keyof PasswordVisibility) {
    setVisible((current) => ({ ...current, [key]: !current[key] }))
  }

  async function handleSignIn(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    clearErrors()

    const errors: Record<string, string> = {}
    if (!signinEmail || !isOrgEmail(signinEmail)) {
      errors.signinEmail = `Please enter a valid ${orgDomain} email`
    }
    if (!signinPassword) {
      errors.signinPassword = 'Password is required'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setBusy('signin')
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: signinEmail.trim(),
      password: signinPassword,
    })
    setBusy(null)

    if (error) {
      setSigninError(formatAuthError(error.message))
      return
    }

    setSigninOk('Signed in! Redirecting...')
    try {
      localStorage.setItem(
        'obf_session_cache',
        JSON.stringify({
          timestamp: Date.now(),
          email: data?.session?.user?.email || data?.user?.email || signinEmail,
        }),
      )
    } catch (error) {
      console.error('Unable to cache local session:', error)
    }
    window.setTimeout(() => navigate('/fill-details', { replace: true }), 700)
  }

  async function handleSignUp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    clearErrors()

    const errors: Record<string, string> = {}
    if (!signupName.trim()) errors.signupName = 'Full name is required'
    if (!signupEmail || !isOrgEmail(signupEmail)) {
      errors.signupEmail = `Must be a valid ${orgDomain} email`
    }
    if (!signupPassword || signupPassword.length < 8) {
      errors.signupPassword = 'Password must be at least 8 characters'
    }
    if (signupPassword !== signupConfirm) {
      errors.signupConfirm = 'Passwords do not match'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setBusy('signup')
    const { error } = await supabaseClient.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: { full_name: signupName.trim() },
        emailRedirectTo: new URL('/login', window.location.origin).href,
      },
    })
    setBusy(null)

    if (error) {
      setSignupError(formatAuthError(error.message))
      return
    }

    setPendingEmail(signupEmail.trim())
    setTab('pending')
  }

  async function handleForgotPassword() {
    clearErrors()
    if (!signinEmail || !isOrgEmail(signinEmail)) {
      setFieldErrors({ signinEmail: `Enter your ${orgDomain} email first` })
      return
    }

    setBusy('forgot')
    const { error } = await supabaseClient.auth.resetPasswordForEmail(signinEmail.trim(), {
      redirectTo: new URL('/login', window.location.origin).href,
    })
    setBusy(null)

    if (error) {
      setSigninError('Could not send reset email. Try again.')
      return
    }

    setSigninOk(`Password reset link sent to ${signinEmail.trim()}`)
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card" aria-label="OakBoard authentication">
        <div className="auth-card-hdr">
          <div className="auth-logo-wrap">
            <img src="/oakboard-logo.svg" alt="Oak Street Technologies" />
          </div>
          <div className="auth-title">Welcome to OakBoard</div>
          <div className="auth-sub">Sign in with your work email to continue</div>
        </div>

        {tab !== 'pending' && (
          <div className="tab-row">
            <button className={`tab-btn ${tab === 'signin' ? 'active' : ''}`} onClick={() => switchTab('signin')} type="button">
              Sign In
            </button>
            <button className={`tab-btn ${tab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')} type="button">
              Create Account
            </button>
          </div>
        )}

        <div className="auth-body">
          {tab === 'signin' && (
            <form className="form-panel active" onSubmit={handleSignIn}>
              {signinError && (
                <div className="banner-err show">
                  <AlertIcon />
                  <span>{signinError}</span>
                </div>
              )}
              {signinOk && (
                <div className="banner-ok show">
                  <CheckIcon />
                  <span>{signinOk}</span>
                </div>
              )}

              <div className="fld">
                <label htmlFor="si-email">Work Email</label>
                <div className="inp-wrap">
                  <FieldIcon type="email" />
                  <input
                    autoComplete="email"
                    className={fieldErrors.signinEmail ? 'err-inp' : ''}
                    id="si-email"
                    onChange={(event) => {
                      clearErrors()
                      setSigninEmail(event.target.value)
                    }}
                    placeholder="yourname@9ostech.com"
                    type="email"
                    value={signinEmail}
                  />
                </div>
                {fieldErrors.signinEmail && <span className="field-err show">{fieldErrors.signinEmail}</span>}
              </div>

              <div className="fld">
                <label htmlFor="si-pw">Password</label>
                <div className="inp-wrap">
                  <FieldIcon type="lock" />
                  <input
                    autoComplete="current-password"
                    className={`has-toggle ${fieldErrors.signinPassword ? 'err-inp' : ''}`}
                    id="si-pw"
                    onChange={(event) => {
                      clearErrors()
                      setSigninPassword(event.target.value)
                    }}
                    placeholder="Your password"
                    type={visible.signin ? 'text' : 'password'}
                    value={signinPassword}
                  />
                  <button className="toggle-pw" onClick={() => toggleVisibility('signin')} type="button">
                    <EyeIcon hidden={!visible.signin} />
                  </button>
                </div>
                {fieldErrors.signinPassword && <span className="field-err show">{fieldErrors.signinPassword}</span>}
              </div>

              <div className="forgot-row">
                <button className="link-btn" disabled={busy === 'forgot'} onClick={handleForgotPassword} type="button">
                  {busy === 'forgot' ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>

              <button className={`btn-submit ${busy === 'signin' ? 'loading' : ''}`} disabled={busy === 'signin'} type="submit">
                <span className="btn-spin" />
                <span className="btn-txt">Sign In</span>
                <svg className="btn-txt" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </button>
            </form>
          )}

          {tab === 'signup' && (
            <form className="form-panel active" onSubmit={handleSignUp}>
              {signupError && (
                <div className="banner-err show">
                  <AlertIcon />
                  <span>{signupError}</span>
                </div>
              )}

              <div className="fld">
                <label htmlFor="su-name">Full Name</label>
                <div className="inp-wrap">
                  <FieldIcon type="user" />
                  <input
                    autoComplete="name"
                    className={fieldErrors.signupName ? 'err-inp' : ''}
                    id="su-name"
                    onChange={(event) => {
                      clearErrors()
                      setSignupName(event.target.value)
                    }}
                    placeholder="Your full name"
                    type="text"
                    value={signupName}
                  />
                </div>
                {fieldErrors.signupName && <span className="field-err show">{fieldErrors.signupName}</span>}
              </div>

              <div className="fld">
                <label htmlFor="su-email">Work Email</label>
                <div className="inp-wrap">
                  <FieldIcon type="email" />
                  <input
                    autoComplete="email"
                    className={fieldErrors.signupEmail ? 'err-inp' : ''}
                    id="su-email"
                    onChange={(event) => {
                      clearErrors()
                      setSignupEmail(event.target.value)
                    }}
                    placeholder="yourname@9ostech.com"
                    type="email"
                    value={signupEmail}
                  />
                </div>
                {fieldErrors.signupEmail && <span className="field-err show">{fieldErrors.signupEmail}</span>}
              </div>

              <div className="fld">
                <label htmlFor="su-pw">Password</label>
                <div className="inp-wrap">
                  <FieldIcon type="lock" />
                  <input
                    autoComplete="new-password"
                    className={`has-toggle ${fieldErrors.signupPassword ? 'err-inp' : ''}`}
                    id="su-pw"
                    onChange={(event) => {
                      clearErrors()
                      setSignupPassword(event.target.value)
                    }}
                    placeholder="Min. 8 characters"
                    type={visible.signup ? 'text' : 'password'}
                    value={signupPassword}
                  />
                  <button className="toggle-pw" onClick={() => toggleVisibility('signup')} type="button">
                    <EyeIcon hidden={!visible.signup} />
                  </button>
                </div>
                {fieldErrors.signupPassword && <span className="field-err show">{fieldErrors.signupPassword}</span>}
                {passwordStrength && (
                  <div className="pw-strength">
                    <div className="pw-track">
                      <div className="pw-bar" style={{ width: passwordStrength.width, background: passwordStrength.color }} />
                    </div>
                    <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                  </div>
                )}
              </div>

              <div className="fld no-bottom">
                <label htmlFor="su-pw2">Confirm Password</label>
                <div className="inp-wrap">
                  <FieldIcon type="lock" />
                  <input
                    autoComplete="new-password"
                    className={`has-toggle ${fieldErrors.signupConfirm ? 'err-inp' : ''}`}
                    id="su-pw2"
                    onChange={(event) => {
                      clearErrors()
                      setSignupConfirm(event.target.value)
                    }}
                    placeholder="Repeat password"
                    type={visible.confirm ? 'text' : 'password'}
                    value={signupConfirm}
                  />
                  <button className="toggle-pw" onClick={() => toggleVisibility('confirm')} type="button">
                    <EyeIcon hidden={!visible.confirm} />
                  </button>
                </div>
                {fieldErrors.signupConfirm && <span className="field-err show">{fieldErrors.signupConfirm}</span>}
              </div>

              <button className={`btn-submit ${busy === 'signup' ? 'loading' : ''}`} disabled={busy === 'signup'} type="submit">
                <span className="btn-spin" />
                <span className="btn-txt">Create Account</span>
                <svg className="btn-txt" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </button>
              <p className="terms-note">
                By creating an account you agree to the
                <br />
                <a href="/login">Terms of Service</a> &amp; <a href="/login">Privacy Policy</a> of 9ostech.
              </p>
            </form>
          )}

          {tab === 'pending' && (
            <div className="pending-panel active">
              <div className="pending-icon">
                <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 14h20M14 4l10 10-10 10" />
                </svg>
              </div>
              <div className="pending-title">Check Your Email!</div>
              <div className="pending-sub">
                A confirmation link has been sent to
                <br />
                <strong>{pendingEmail || 'your email'}</strong>
                <br />
                Click the link in the email to activate your account.
              </div>
              <div className="info-box">
                {[
                  'Verification email sent to your inbox',
                  'Click the link to activate your account, then sign in',
                  `Access is restricted to ${orgDomain} employees only`,
                ].map((item) => (
                  <div className="info-row" key={item}>
                    <div className="info-ic">
                      <CheckIcon />
                    </div>
                    <div className="info-txt">{item}</div>
                  </div>
                ))}
              </div>
              <button className="btn-submit" onClick={() => switchTab('signin')} type="button">
                <span className="btn-txt">Back to Sign In</span>
              </button>
            </div>
          )}

          <div className="auth-footer">
            <span>© 2026 9ostech</span>
            <span className="dot">•</span>
            <a href="/login">Help</a>
            <span className="dot">•</span>
            <a href="/login">Privacy</a>
          </div>
        </div>
      </section>
    </main>
  )
}
