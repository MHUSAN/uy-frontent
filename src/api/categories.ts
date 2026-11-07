import axios from 'axios'

import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { Category } from '@/types/property'

function normalizeCategory(value: unknown): Category | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const id = typeof record.id === 'number' ? record.id : Number(record.id)
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const slug = typeof record.slug === 'string' ? record.slug.trim() : ''

  if (!Number.isInteger(id) || id <= 0 || !name || !slug) {
    return null
  }

  return { id, name, slug }
}

/**
 * GET /categories is implemented in `Backend/src/categories` but has not been
 * runtime-verified. The response shape is taken from the controller/service:
 * an array of `{ id, name, slug }`.
 */
export async function fetchCategories(
  signal?: AbortSignal,
): Promise<Category[]> {
  let data: unknown

  try {
    const response = await apiClient.get<unknown>('/categories', { signal })
    data = response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ApiError(
        'The categories endpoint could not be reached.',
        error.response?.status,
      )
    }

    throw new ApiError('The categories request failed.')
  }

  if (!Array.isArray(data)) {
    throw new ApiError('Unexpected categories response format.')
  }

  const categories = data
    .map(normalizeCategory)
    .filter((category): category is Category => category !== null)

  if (data.length > 0 && categories.length === 0) {
    throw new ApiError('No valid categories in the response.')
  }

  return categories
}
