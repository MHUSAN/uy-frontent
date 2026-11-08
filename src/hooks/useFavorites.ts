import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { addFavorite, fetchFavorites, removeFavorite } from '@/api/favorites'
import { getErrorKey } from '@/api/errors'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import type { Property } from '@/types/property'

type FavoriteEntry = Awaited<ReturnType<typeof fetchFavorites>>[number]

/** One shared favorites list per user: hearts update everywhere instantly. */
export function useFavorites() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const userId = user?.id
  const key = useMemo(() => ['favorites', userId] as const, [userId])

  const query = useQuery({
    queryKey: key,
    queryFn: fetchFavorites,
    enabled: Boolean(userId),
    staleTime: 60_000,
  })

  const list = useMemo(() => query.data ?? [], [query.data])
  const ids = useMemo<ReadonlySet<number>>(
    () => new Set(list.map((entry) => entry.property.id)),
    [list],
  )

  const toggle = useCallback(
    async (property: Pick<Property, 'id'> & Partial<Property>) => {
      if (!userId) {
        toast.error('toast.loginToSave')
        navigate('/login', { state: { from: location.pathname + location.search } })
        return
      }
      const previous = queryClient.getQueryData<FavoriteEntry[]>(key) ?? []
      const saved = previous.some((entry) => entry.property.id === property.id)
      queryClient.setQueryData<FavoriteEntry[]>(
        key,
        saved
          ? previous.filter((entry) => entry.property.id !== property.id)
          : [
              {
                id: -property.id,
                createdAt: new Date().toISOString(),
                property: property as Property,
              },
              ...previous,
            ],
      )
      try {
        if (saved) await removeFavorite(property.id)
        else await addFavorite(property.id)
        toast.success(saved ? 'toast.favoriteRemoved' : 'toast.favoriteAdded')
      } catch (error) {
        const status = (error as { status?: number }).status
        // 409 on add / 404 on remove: the server already agrees with the new state.
        if (!((!saved && status === 409) || (saved && status === 404))) {
          queryClient.setQueryData(key, previous)
          toast.error(getErrorKey(error))
        }
      } finally {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
    [userId, key, queryClient, toast, navigate, location],
  )

  return {
    ids,
    list,
    loading: query.isPending && Boolean(userId),
    error: query.error ? getErrorKey(query.error) : null,
    toggle,
  }
}
