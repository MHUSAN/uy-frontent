import { ImageOff, Info, Pencil, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { getErrorKey } from '@/api/errors'
import { deleteProperty, fetchMyProperties } from '@/api/properties'
import { AccountLayout } from '@/components/AccountLayout'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Feedback } from '@/components/Feedback'
import { StatusPanel } from '@/components/StatusPanel'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import type { Property, PropertyStatus } from '@/types/property'
import { formatDate, formatPrice } from '@/utils/format'
import { House } from 'lucide-react'

const BADGE: Record<PropertyStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-accent-soft text-accent-ink',
  REJECTED: 'bg-red-100 text-red-800',
}

export function SellerDashboardPage() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null)
  const [deleting, setDeleting] = useState(false)
  const myKey = ['my-properties', user?.id] as const

  const mine = useQuery({
    queryKey: myKey,
    queryFn: fetchMyProperties,
    enabled: Boolean(user),
    staleTime: 15_000,
  })
  const items = mine.data?.items ?? []
  const loading = mine.isPending
  const error = mine.isError && !mine.data ? getErrorKey(mine.error) : null

  const confirmDelete = async (property: Property) => {
    setDeleting(true)
    try {
      await deleteProperty(property.id)
      void queryClient.invalidateQueries({ queryKey: ['my-properties'] })
      void queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.removeQueries({ queryKey: ['property', property.id] })
      toast.success('common.deleted')
    } catch (err) {
      toast.error(getErrorKey(err))
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <AccountLayout title={t('account.listings')}>
      <p className="mb-5 flex items-start gap-2 rounded-2xl bg-soft p-4 text-sm text-muted">
        <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        {t('dashboard.editNotice')}
      </p>
      <Feedback messageKey={error} />

      {loading ? (
        <div aria-busy="true" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-72 rounded-2xl bg-soft motion-safe:animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <StatusPanel
          icon={House}
          title={t('dashboard.emptyListings')}
          body={t('dashboard.emptyListingsBody')}
          action={
            <Link
              to="/elon-berish"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-6 text-sm font-bold text-on-accent"
            >
              {t('account.create')}
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((property) => {
            const status = property.status ?? 'PENDING'
            const image = property.images?.[0]
            return (
              <li
                key={property.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_2px_14px_rgba(0,0,0,0.07)]"
              >
                <div className="relative aspect-[16/10] bg-soft">
                  {image ? (
                    <img
                      src={image.url}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted">
                      <ImageOff size={24} aria-hidden="true" />
                    </div>
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-lg px-2.5 py-1 text-xs font-bold ${BADGE[status]}`}
                  >
                    {t(`dashboard.status${status}`)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xl font-bold text-ink">
                    {formatPrice(property.price, property.currency, i18n.language)}
                  </p>
                  <h2 className="mt-1 line-clamp-1 text-sm font-semibold text-ink">
                    {property.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(property.createdAt, i18n.language)}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {t(`dashboard.hint${status}`)}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    {status === 'APPROVED' && (
                      <Link
                        to={`/elonlar/${property.id}`}
                        className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-ink hover:border-ink/40"
                      >
                        {t('common.view')}
                      </Link>
                    )}
                    <Link
                      to={`/elonlar/${property.id}/tahrir`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium text-ink hover:border-ink/40"
                    >
                      <Pencil size={14} aria-hidden="true" />
                      {t('common.edit')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(property)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium text-danger hover:border-danger"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {pendingDelete && (
        <ConfirmDialog
          messageKey="seller.deleteConfirm"
          values={{ title: pendingDelete.title }}
          confirmKey="common.delete"
          busy={deleting}
          onConfirm={() => confirmDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </AccountLayout>
  )
}
