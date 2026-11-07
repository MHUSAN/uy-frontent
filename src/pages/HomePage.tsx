import { useTranslation } from 'react-i18next'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <section className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            {t('home.eyebrow')}
          </p>

          <h1 className="mt-6 max-w-2xl font-display text-4xl leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.5rem]">
            {t('home.title')}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            {t('home.subtitle')}
          </p>
        </div>

        <aside className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {t('home.foundationLabel')}
          </p>
          <h2 className="mt-3 font-display text-2xl tracking-[-0.02em] text-ink">
            {t('home.foundationTitle')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {t('home.foundationBody')}
          </p>

          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">{t('home.languagesLabel')}</dt>
              <dd className="text-right text-ink">{t('home.languagesValue')}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">{t('home.themeLabel')}</dt>
              <dd className="text-right text-ink">{t('home.themeValue')}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  )
}
