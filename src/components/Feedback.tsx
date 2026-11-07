import { useTranslation } from 'react-i18next'

export function Feedback({
  messageKey,
  success = false,
}: {
  messageKey: string | null
  success?: boolean
}) {
  const { t } = useTranslation()
  return messageKey ? (
    <p
      role={success ? 'status' : 'alert'}
      className={`break-words text-sm ${success ? 'text-accent' : 'text-danger'}`}
    >
      {t(messageKey)}
    </p>
  ) : null
}

export function PageLoading() {
  const { t } = useTranslation()
  return (
    <p
      role="status"
      className="mx-auto w-full max-w-5xl px-4 py-12 text-sm text-muted"
    >
      {t('common.loading')}
    </p>
  )
}
