import { useCallback, useEffect, useState } from 'react'

import { fetchCategories } from '@/api/categories'
import { ApiError } from '@/api/errors'
import type { Category } from '@/types/property'

export type CategoryStatus = 'loading' | 'ready' | 'empty' | 'error'

interface CategoriesState {
  status: CategoryStatus
  categories: Category[]
  error: ApiError | null
}

const INITIAL_STATE: CategoriesState = {
  status: 'loading',
  categories: [],
  error: null,
}

export function useCategories() {
  const [state, setState] = useState<CategoriesState>(INITIAL_STATE)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    void fetchCategories(controller.signal).then(
      (categories) => {
        if (controller.signal.aborted) {
          return
        }

        setState({
          status: categories.length > 0 ? 'ready' : 'empty',
          categories,
          error: null,
        })
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setState({
          status: 'error',
          categories: [],
          error:
            error instanceof ApiError
              ? error
              : new ApiError('The categories request failed.'),
        })
      },
    )

    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setState(INITIAL_STATE)
    setAttempt((current) => current + 1)
  }, [])

  return { ...state, retry }
}
