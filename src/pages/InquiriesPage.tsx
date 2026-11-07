import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchReceivedInquiries, fetchSentInquiries } from '@/api/inquiries'
import type { Inquiry } from '@/api/inquiries'
import { getErrorKey } from '@/api/errors'
import { Feedback, PageLoading } from '@/components/Feedback'
import { formatDate, formatNumber } from '@/utils/format'

export function InquiriesPage() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<'sent' | 'received'>('sent')
  const [sent, setSent] = useState<Inquiry[]>([])
  const [received, setReceived] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    Promise.all([fetchSentInquiries(), fetchReceivedInquiries()])
      .then(([a, b]) => {
        setSent(a)
        setReceived(b)
      })
      .catch((err) => setError(getErrorKey(err)))
      .finally(() => setLoading(false))
  }, [])
  if (loading) return <PageLoading />
  const list = tab === 'sent' ? sent : received
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl text-ink">{t('inquiries.title')}</h1>
      <div className="mt-4">
        <Feedback messageKey={error} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(['sent', 'received'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={`rounded-md px-3 py-2 text-sm ${tab === value ? 'bg-accent text-on-accent' : 'border border-line'}`}
          >
            {t(`inquiries.${value}`, {
              value: formatNumber(
                value === 'sent' ? sent.length : received.length,
                i18n.language,
              ),
            })}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {list.map((inquiry) => (
          <article
            key={inquiry.id}
            className="min-w-0 rounded-lg border border-line bg-surface p-4"
          >
            <p className="break-words text-sm font-semibold text-ink">
              {inquiry.property.title}
            </p>
            <p className="mt-1 break-words text-xs text-muted">
              {formatDate(inquiry.createdAt, i18n.language)} · {inquiry.phone}
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink">
              {inquiry.message}
            </p>
          </article>
        ))}
        {!error && list.length === 0 && (
          <p className="text-sm text-muted">{t('inquiries.empty')}</p>
        )}
      </div>
    </section>
  )
}
