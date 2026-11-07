import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex w-full max-w-[88rem] flex-1 flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
      <p className="font-display text-6xl leading-none text-accent">404</p>
      <h1 className="mt-5 font-display text-3xl tracking-[-0.025em] text-ink">
        {t('notFound.title')}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        {t('notFound.body')}
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex w-fit items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
      >
        <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" />
        {t('notFound.back')}
      </Link>
    </div>
  )
}
