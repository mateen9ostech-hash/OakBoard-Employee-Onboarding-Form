import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Button, PageToolbar, StatusBanner } from '@/components/ui'
import { apiFetch } from '@/lib/api/client'
import { changePassword, getValidSession } from '@/lib/auth/client'

type Profile = {
  email: string
  fullName: string
  jobTitle: string
  department: string
  phone: string
  avatar: string | null
}

const emptyProfile: Profile = {
  email: '', fullName: '', jobTitle: '', department: '', phone: '',
  avatar: null,
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const sessionResult = await getValidSession()
        if (active && sessionResult.ok) {
          const user = sessionResult.session.user
          setProfile((current) => ({
            ...current,
            email: user.email || '',
            fullName: user.user_metadata.full_name
              || user.user_metadata.name
              || user.user_metadata.display_name
              || '',
          }))
        }

        const response = await apiFetch('/api/profile', { cache: 'no-store' })
        const result = await response.json().catch(() => null) as { profile?: Profile; error?: string } | null
        if (!active) return
        if (!response.ok || !result?.profile) {
          setError(result?.error || 'Your profile could not be loaded.')
        } else {
          setProfile(result.profile)
        }
      } catch {
        if (active) setError('Your profile could not be loaded. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  function change(field: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 350_000) {
      setError('Choose a PNG, JPG, or WebP image smaller than 350 KB.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setProfile((current) => ({ ...current, avatar: String(reader.result) }))
      setError('')
      setNotice('Image selected. Save your profile to keep it.')
    }
    reader.onerror = () => setError('That image could not be read. Please choose another file.')
    reader.readAsDataURL(file)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await apiFetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile),
      })
      const result = await response.json().catch(() => null) as { profile?: Profile; error?: string } | null
      if (!response.ok || !result?.profile) { setError(result?.error || 'Your profile could not be saved.'); return }
      setProfile(result.profile)
      setNotice('Profile changes saved.')
    } catch {
      setError('Your profile could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordError('')
    setPasswordNotice('')

    if (!currentPassword) {
      setPasswordError('Enter your current password so we can verify your account.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Your new password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.')
      return
    }

    setPasswordSaving(true)
    const result = await changePassword(currentPassword, newPassword)
    if (result.error) {
      setPasswordError(result.error.message)
      setPasswordSaving(false)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordNotice('Password changed successfully. Your other sessions have been signed out.')
    setPasswordSaving(false)
  }

  return (
    <main className="profile-page">
      <PageToolbar actions={null} backLabel="Workspace" backTo="/workspace" subtitle="Manage your personal information" title="My Profile" />
      <div className="profile-shell">
        {error && <StatusBanner tone="error">{error}</StatusBanner>}
        {notice && <StatusBanner tone="success">{notice}</StatusBanner>}
        {loading ? <div className="profile-loading"><span className="auth-loader__spinner" /><p>Loading profile...</p></div> : (
          <div className="profile-sections">
          <form className="profile-card" onSubmit={save}>
            <div className="profile-card-heading">
              <p className="profile-kicker">Account settings</p>
              <h2>Personal information</h2>
              <p>Keep your details current for a more personalized onboarding workspace.</p>
            </div>
            <div className="profile-avatar-editor">
              <div className="profile-avatar">
                {profile.avatar ? <img alt="Profile" src={profile.avatar} /> : <span>{profile.fullName.trim().charAt(0).toUpperCase() || '?'}</span>}
              </div>
              <div className="profile-avatar-copy">
                <strong>Profile image</strong>
                <p>PNG, JPG, or WebP; maximum 350 KB.</p>
                <label className="profile-upload-button">
                  Choose image
                  <input accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar} type="file" />
                </label>
              </div>
              {profile.avatar && <Button className="profile-remove-button" onClick={() => setProfile((current) => ({ ...current, avatar: null }))} type="button" variant="danger">Remove</Button>}
            </div>
            <div className="profile-grid">
              <label>Full name<input maxLength={160} onChange={(e) => change('fullName', e.target.value)} required value={profile.fullName} /></label>
              <label>Work email<input aria-readonly="true" readOnly value={profile.email} /><small>Linked to your account and cannot be changed here.</small></label>
              <label>Job title<input maxLength={120} onChange={(e) => change('jobTitle', e.target.value)} value={profile.jobTitle} /></label>
              <label>Department<input maxLength={120} onChange={(e) => change('department', e.target.value)} value={profile.department} /></label>
              <label>Contact number<input maxLength={40} onChange={(e) => change('phone', e.target.value)} type="tel" value={profile.phone} /></label>
            </div>
            <div className="profile-actions"><Button disabled={saving} type="submit" variant="primary">{saving ? 'Saving...' : 'Save profile'}</Button></div>
          </form>
          <form className="profile-card profile-security-card" onSubmit={savePassword}>
            <div className="profile-card-heading">
              <p className="profile-kicker">Account security</p>
              <h2>Change password</h2>
              <p>Verify your current password, then choose a new password for your account.</p>
            </div>
            {passwordError && <StatusBanner tone="error">{passwordError}</StatusBanner>}
            {passwordNotice && <StatusBanner tone="success">{passwordNotice}</StatusBanner>}
            <div className="profile-password-grid">
              <label>
                Current password
                <input
                  autoComplete="current-password"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  type="password"
                  value={currentPassword}
                />
              </label>
              <label>
                New password
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  type="password"
                  value={newPassword}
                />
                <small>Use at least 8 characters.</small>
              </label>
              <label>
                Confirm new password
                <input
                  aria-invalid={confirmPassword !== '' && newPassword !== confirmPassword}
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
                {confirmPassword !== '' && (
                  <small className={newPassword === confirmPassword ? 'is-match' : 'is-mismatch'}>
                    {newPassword === confirmPassword ? 'Passwords match.' : 'Passwords do not match.'}
                  </small>
                )}
              </label>
            </div>
            <div className="profile-actions">
              <Button disabled={passwordSaving} type="submit" variant="primary">
                {passwordSaving ? 'Changing...' : 'Change password'}
              </Button>
            </div>
          </form>
          </div>
        )}
      </div>
    </main>
  )
}
