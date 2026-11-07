import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { deleteProperty, fetchMyProperties } from '@/api/properties'
import { getErrorKey } from '@/api/errors'
import { Feedback, PageLoading } from '@/components/Feedback'
import type { Property } from '@/types/property'
import { formatDate, formatPrice } from '@/utils/format'

export function SellerDashboardPage() {
  const { t, i18n } = useTranslation()
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [items, setItems] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const load = () => {
    setLoading(true)
    setError(null)
    fetchMyProperties()
      .then((p) => setItems(p.items))
      .catch((err) => setError(getErrorKey(err)))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
  }, [])
  const handleDelete = async (property: Property) => {
    setDeleting(true)
    try {
      await deleteProperty(property.id)
      setSuccess('common.deleted')
      load()
    } catch (err) {
      setError(getErrorKey(err))
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }
  if (loading) return <PageLoading />
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">
          {t('account.listings')}
        </h1>
        <Link
          to="/elon-berish"
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent"
        >
          {t('form.create')}
        </Link>
      </div>
      <div className="mt-4">
        <Feedback messageKey={error} />
        <Feedback messageKey={success} success />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((property) => (
          <article
            key={property.id}
            className="min-w-0 rounded-lg border border-line bg-surface p-4"
          >
            <p className="break-words font-semibold text-ink">
              {property.title}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t(`status.${property.status ?? 'PENDING'}`)}
            </p>
            <p className="mt-2 text-sm">
              {formatPrice(property.price, property.currency, i18n.language)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {formatDate(property.createdAt, i18n.language)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={`/elonlar/${property.id}`}
                className="rounded border border-line px-3 py-2 text-xs"
              >
                {t('common.view')}
              </Link>
              <Link
                to={`/elonlar/${property.id}/tahrir`}
                className="rounded border border-line px-3 py-2 text-xs"
              >
                {t('common.edit')}
              </Link>
              <button
                onClick={() => setPendingDelete(property)}
                className="rounded border border-line px-3 py-2 text-xs text-danger"
              >
                {t('common.delete')}
              </button>
            </div>
          </article>
        ))}
      </div>
      {!error && items.length === 0 && (
        <p className="mt-6 text-sm text-muted">{t('seller.empty')}</p>
      )}
      {pendingDelete && (
        <ConfirmDialog
          messageKey="seller.deleteConfirm"
          values={{ title: pendingDelete.title }}
          confirmKey="common.delete"
          busy={deleting}
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}
