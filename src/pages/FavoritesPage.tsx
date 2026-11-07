import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { fetchFavorites, removeFavorite } from '@/api/favorites'
import { getErrorKey } from '@/api/errors'
import { Feedback, PageLoading } from '@/components/Feedback'
import { locationLabel } from '@/utils/localize'

export function FavoritesPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<
    { id: number; property: { id: number; title: string; city: string } }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = () => {
    setLoading(true)
    setError(null)
    fetchFavorites()
      .then(setItems)
      .catch((err) => setError(getErrorKey(err)))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
  }, [])
  const remove = async (id: number) => {
    try {
      await removeFavorite(id)
      load()
    } catch (err) {
      setError(getErrorKey(err))
    }
  }
  if (loading) return <PageLoading />
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl text-ink">
        {t('account.favorites')}
      </h1>
      <div className="mt-4">
        <Feedback messageKey={error} />
      </div>
      {!error && items.length === 0 && (
        <p className="mt-6 text-sm text-muted">{t('favorites.empty')}</p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface"
          >
            <Link to={`/elonlar/${item.property.id}`} className="block p-4">
              <p className="break-words font-semibold text-ink">
                {item.property.title}
              </p>
              <p className="mt-1 text-sm text-muted">
                {locationLabel(item.property.city, t)}
              </p>
            </Link>
            <button
              onClick={() => remove(item.property.id)}
              className="w-full border-t border-line px-4 py-2 text-sm text-muted hover:text-danger"
            >
              {t('common.remove')}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
