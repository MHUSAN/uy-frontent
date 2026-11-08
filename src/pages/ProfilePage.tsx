import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { updateCurrentUser } from '@/api/auth'
import { getErrorKey } from '@/api/errors'
import { UserAvatar } from '@/components/AccountMenu'
import { AccountLayout } from '@/components/AccountLayout'
import { Feedback } from '@/components/Feedback'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'

const PHONE_PATTERN = /^(\+998)?\d{9}$/
const FIELD =
  'h-12 w-full rounded-2xl border bg-surface px-4 text-base text-ink focus:border-ink'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!user) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const next: Record<string, string> = {}
    const name = fullName.trim()
    const contact = phone.replace(/[\s()-]/g, '')
    if (name.length < 2 || name.length > 100) next.fullName = t('authFlow.invalidName')
    if (contact && !PHONE_PATTERN.test(contact)) next.phone = t('validation.phone')
    setErrors(next)
    if (Object.keys(next).length) return

    // Send only what changed: the API accepts fullName and phone, nothing else.
    const payload: { fullName?: string; phone?: string } = {}
    if (name !== user.fullName) payload.fullName = name
    if (contact && contact !== (user.phone ?? '')) payload.phone = contact
    if (!Object.keys(payload).length) {
      toast.success('dashboard.noChanges')
      return
    }
    setBusy(true)
    try {
      await updateCurrentUser(payload)
      await refresh()
      toast.success('dashboard.profileSaved')
    } catch (error) {
      setFormError(getErrorKey(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountLayout title={t('dashboard.profileTitle')}>
      <div className="max-w-xl">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="break-words text-lg font-bold text-ink">{user.fullName}</p>
            <p className="break-all text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <form noValidate onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold">
              {t('authFlow.fullName')}
            </label>
            <input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(errors.fullName)}
              className={`${FIELD} ${errors.fullName ? 'border-danger' : 'border-line'}`}
            />
            {errors.fullName && (
              <p role="alert" className="mt-1.5 text-xs text-danger">{errors.fullName}</p>
            )}
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-2 block text-sm font-semibold">
              {t('authFlow.email')}
            </label>
            <input
              id="profile-email"
              value={user.email}
              readOnly
              aria-describedby="profile-email-hint"
              className={`${FIELD} border-line bg-soft text-muted`}
            />
            <p id="profile-email-hint" className="mt-1.5 text-xs text-muted">
              {t('dashboard.emailLocked')}
            </p>
          </div>
          <div>
            <label htmlFor="profile-phone" className="mb-2 block text-sm font-semibold">
              {t('account.phone')}
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder={t('details.phoneHint')}
              aria-invalid={Boolean(errors.phone)}
              className={`${FIELD} ${errors.phone ? 'border-danger' : 'border-line'}`}
            />
            {errors.phone && (
              <p role="alert" className="mt-1.5 text-xs text-danger">{errors.phone}</p>
            )}
          </div>
          <Feedback messageKey={formError} />
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-nav px-6 text-sm font-semibold text-white hover:bg-black disabled:opacity-60 sm:w-auto"
          >
            {busy ? t('common.saving') : t('dashboard.saveProfile')}
          </button>
        </form>
      </div>
    </AccountLayout>
  )
}
