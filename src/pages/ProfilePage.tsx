import { useTranslation } from 'react-i18next'
import { UserAvatar } from '@/components/AccountMenu'
import { useAuth } from '@/hooks/useAuth'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  if (!user) return null
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl text-ink">{t('account.profile')}</h1>
      <div className="mt-6 rounded-xl border border-line bg-surface p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <p className="min-w-0 break-words text-lg font-semibold text-ink">
            {user.fullName}
          </p>
        </div>
        <dl className="mt-6 space-y-5">
          {[
            { label: t('authFlow.fullName'), value: user.fullName },
            { label: t('authFlow.email'), value: user.email },
            {
              label: t('account.phone'),
              value: user.phone || t('account.notProvided'),
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-ink">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
