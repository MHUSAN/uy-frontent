import { apiClient, normalizeApiError, resolveImageUrl } from '@/api/client'
import type {
  Category,
  ListingType,
  Property,
  PropertyImage,
  PropertyStatus,
} from '@/types/property'
import type { SearchFilters } from '@/types/search'

const CURRENCY_MAP: Record<string, string> = {
  usd: 'USD',
  uzs: 'UZS',
  eur: 'EUR',
}

function mapImage(image: Record<string, unknown>): PropertyImage {
  return {
    id: Number(image.id),
    url: resolveImageUrl(String(image.url)),
    altText: (image.altText as string | null) ?? null,
    sortOrder: Number(image.sortOrder ?? 0),
  }
}

export function mapProperty(value: unknown): Property {
  const r = value as Record<string, unknown>
  return {
    id: Number(r.id),
    title: String(r.title ?? ''),
    description: String(r.description ?? ''),
    price: Number(r.price),
    currency: String(r.currency ?? 'USD'),
    listingType: (r.listingType as ListingType) ?? 'SALE',
    status: (r.status as PropertyStatus) ?? undefined,
    address: String(r.address ?? ''),
    city: String(r.city ?? ''),
    area: Number(r.area),
    rooms: Number(r.rooms),
    bathrooms: Number(r.bathrooms),
    createdAt: String(r.createdAt),
    updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
    images: Array.isArray(r.images)
      ? (r.images as Record<string, unknown>[]).map(mapImage)
      : [],
    category: r.category ? (r.category as Category) : null,
    owner: r.owner
      ? {
          id: Number((r.owner as Record<string, unknown>).id),
          fullName: String((r.owner as Record<string, unknown>).fullName ?? ''),
          phone: ((r.owner as Record<string, unknown>).phone as string | null) ?? null,
          email: ((r.owner as Record<string, unknown>).email as string | null) ?? null,
        }
      : null,
    ownerId: r.ownerId ? Number(r.ownerId) : undefined,
  }
}

export interface PropertyPage {
  items: Property[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type SortValue = 'newest' | 'price_asc' | 'price_desc'

/** Only parameters documented by the API: unknown ones are rejected with 400. */
export function toQueryParams(filters: Partial<SearchFilters> = {}): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (filters.listingType) params.type = filters.listingType
  if (filters.city?.trim()) params.city = filters.city.trim()
  if (filters.categorySlug) params.category = filters.categorySlug
  if (filters.minPrice?.trim()) params.minPrice = Number(filters.minPrice)
  if (filters.maxPrice?.trim()) params.maxPrice = Number(filters.maxPrice)
  if (filters.rooms) params.rooms = Number(filters.rooms)
  return params
}

/** API shape: { data, meta: { page, limit, total, totalPages } }. */
export function mapPage(payload: unknown, fallbackPage = 1, fallbackLimit = 12): PropertyPage {
  const r = (payload ?? {}) as Record<string, unknown>
  const rows = Array.isArray(r.data) ? r.data : Array.isArray(r.items) ? r.items : []
  const meta = (r.meta ?? r) as Record<string, unknown>
  return {
    items: rows.map(mapProperty),
    total: Number(meta.total ?? rows.length),
    page: Number(meta.page ?? fallbackPage),
    limit: Number(meta.limit ?? fallbackLimit),
    totalPages: Math.max(1, Number(meta.totalPages ?? 1)),
  }
}

export async function fetchProperties(
  filters: Partial<SearchFilters> = {},
  page = 1,
  limit = 12,
  sort: SortValue = 'newest',
): Promise<PropertyPage> {
  try {
    const params = { ...toQueryParams(filters), page, limit, sort }
    const { data } = await apiClient.get('/properties', { params })
    return mapPage(data, page, limit)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function fetchProperty(id: number, token?: string | null): Promise<Property> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    const { data } = await apiClient.get(`/properties/${id}`, { headers })
    return mapProperty(data)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function createProperty(payload: Record<string, unknown>): Promise<Property> {
  try {
    const { data } = await apiClient.post('/properties', payload)
    return mapProperty(data)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function updateProperty(
  id: number,
  payload: Record<string, unknown>,
): Promise<Property> {
  try {
    const { data } = await apiClient.patch(`/properties/${id}`, payload)
    return mapProperty(data)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function deleteProperty(id: number): Promise<void> {
  try {
    await apiClient.delete(`/properties/${id}`)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

/**
 * One request per image, multipart field name `image`. Content-Type is left to
 * the browser so the multipart boundary is set correctly.
 */
export async function uploadPropertyImage(id: number, file: File): Promise<PropertyImage> {
  try {
    const form = new FormData()
    form.append('image', file)
    const { data } = await apiClient.post(`/properties/${id}/images`, form, {
      headers: { 'Content-Type': undefined },
      timeout: 60_000,
    })
    return mapImage(data as Record<string, unknown>)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function deletePropertyImage(id: number, imageId: number): Promise<void> {
  try {
    await apiClient.delete(`/properties/${id}/images/${imageId}`)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

/** GET /properties/my returns a plain array (no pagination). */
export async function fetchMyProperties(): Promise<PropertyPage> {
  try {
    const { data } = await apiClient.get('/properties/my')
    const rows = Array.isArray(data) ? data.map(mapProperty) : []
    return { items: rows, total: rows.length, page: 1, limit: rows.length, totalPages: 1 }
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export { resolveImageUrl, CURRENCY_MAP }
