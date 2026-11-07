import { apiClient, normalizeApiError } from '@/api/client'
import { resolveImageUrl } from '@/api/properties'
import type { Property } from '@/types/property'

function mapFavorite(value: unknown): { id: number; createdAt: string; property: Property } {
  const r = value as Record<string, unknown>
  const prop = r.property as unknown
  return {
    id: Number(r.id),
    createdAt: String(r.createdAt),
    property: {
      ...(prop as Property),
      images:
        (prop as { images?: Array<Record<string, unknown>> }).images?.map((img) => ({
          id: Number(img.id),
          url: resolveImageUrl(String(img.url)),
          altText: (img.altText as string | null) ?? null,
          sortOrder: Number(img.sortOrder ?? 0),
        })) ?? [],
    },
  }
}

export async function fetchFavorites() {
  try {
    const { data } = await apiClient.get('/favorites')
    return Array.isArray(data) ? data.map(mapFavorite) : []
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function addFavorite(propertyId: number) {
  try {
    const { data } = await apiClient.post(`/favorites/${propertyId}`)
    return mapFavorite(data)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function removeFavorite(propertyId: number) {
  try {
    await apiClient.delete(`/favorites/${propertyId}`)
  } catch (error) {
    throw normalizeApiError(error)
  }
}
