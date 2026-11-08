import { Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { ScrollToHash } from '@/components/ScrollToHash'

export function RootLayout() {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language

  useEffect(() => {
    document.title = t('app.title')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('app.description'))
  }, [t, language])

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <ScrollToHash />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
      >
        {t('a11y.skipToContent')}
      </a>

      <Header />

      <main id="main-content" className="flex flex-1 flex-col">
        <Suspense
          fallback={
            <div role="status" aria-busy="true" className="mx-auto w-full max-w-[1440px] px-3 pt-6 sm:px-6">
              <div className="h-96 rounded-3xl bg-soft motion-safe:animate-pulse" />
              <span className="sr-only">{t('common.loading')}</span>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
