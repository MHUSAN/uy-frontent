import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AccountLayout } from '@/components/AccountLayout'
import { Feedback } from '@/components/Feedback'
import { PropertyCard } from '@/components/PropertyCard'
import { StatusPanel } from '@/components/StatusPanel'
import { useFavorites } from '@/hooks/useFavorites'

export function FavoritesPage() {
  const { t } = useTranslation()
  const favorites = useFavorites()

  return (
    <AccountLayout title={t('account.favorites')}>
      <Feedback messageKey={favorites.error} />
      {favorites.loading ? (
        <div aria-busy="true" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-72 rounded-2xl bg-soft motion-safe:animate-pulse" />
          ))}
        </div>
      ) : favorites.list.length === 0 && !favorites.error ? (
        <StatusPanel
          icon={Heart}
          title={t('dashboard.emptyFavorites')}
          body={t('dashboard.emptyFavoritesBody')}
          action={
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-6 text-sm font-bold text-on-accent"
            >
              {t('dashboard.browse')}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.list.map(({ property }) => (
            <PropertyCard
              key={property.id}
              property={property}
              isFavorite
              onFavoriteToggle={(p) => void favorites.toggle(p)}
            />
          ))}
        </div>
      )}
    </AccountLayout>
  )
}
