import { useQuery } from '@tanstack/react-query'

import { fetchCategories } from '@/api/categories'
import { ApiError } from '@/api/errors'
import type { Category } from '@/types/property'

export type CategoryStatus = 'loading' | 'ready' | 'empty' | 'error'

const STORAGE_KEY = 'tezuy.categories'
export const CATEGORIES_KEY = ['categories'] as const

interface Stored {
  at: number
  data: Category[]
}

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Stored) : null
    return parsed && Array.isArray(parsed.data) && parsed.data.length ? parsed : null
  } catch {
    return null
  }
}

export function clearStoredCategories() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage is optional.
  }
}

/** Categories rarely change: show the saved copy at once, refresh in the background. */
export function useCategories() {
  const stored = readStored()
  const query = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async ({ signal }) => {
      const data = await fetchCategories(signal)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), data }))
      } catch {
        // Storage is optional.
      }
      return data
    },
    staleTime: 10 * 60_000,
    initialData: stored?.data,
    initialDataUpdatedAt: stored?.at,
  })

  const categories = query.data ?? []
  const status: CategoryStatus = query.isPending
    ? 'loading'
    : query.isError && categories.length === 0
      ? 'error'
      : categories.length === 0
        ? 'empty'
        : 'ready'

  return {
    status,
    categories,
    error: query.error ? (query.error instanceof ApiError ? query.error : new ApiError('The categories request failed.')) : null,
    retry: () => void query.refetch(),
  }
}
