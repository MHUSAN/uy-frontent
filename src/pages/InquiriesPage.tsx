import { MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { fetchSentInquiries } from '@/api/inquiries'
import type { Inquiry } from '@/api/inquiries'
import { getErrorKey } from '@/api/errors'
import { AccountLayout } from '@/components/AccountLayout'
import { Feedback } from '@/components/Feedback'
import { StatusPanel } from '@/components/StatusPanel'
import { formatDate, formatPrice } from '@/utils/format'
import { locationLabel } from '@/utils/localize'

export function InquiriesPage() {
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchSentInquiries()
      .then((list) => !cancelled && setItems(list))
      .catch((err) => !cancelled && setError(getErrorKey(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AccountLayout title={t('inquiries.title')}>
      <Feedback messageKey={error} />
      {loading ? (
        <div aria-busy="true" className="space-y-3">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-soft motion-safe:animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <StatusPanel
          icon={MessageSquare}
          title={t('dashboard.inquiriesEmpty')}
          body={t('dashboard.browse')}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((inquiry) => (
            <li key={inquiry.id} className="min-w-0 rounded-2xl border border-line p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to={`/elonlar/${inquiry.property.id}`}
                  className="break-words text-sm font-bold text-ink hover:underline"
                >
                  {inquiry.property.title}
                </Link>
                <span className="text-xs text-muted">
                  {formatDate(inquiry.createdAt, i18n.language)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {formatPrice(inquiry.property.price, inquiry.property.currency, i18n.language)}
                {' · '}
                {locationLabel(inquiry.property.city, t)}
                {' · '}
                {inquiry.phone}
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-soft p-3 text-sm text-ink">
                {inquiry.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  )
}
