import { apiClient, normalizeApiError, resolveImageUrl } from '@/api/client'
import type {
  Category,
  ListingType,
  Property,
  PropertyImage,
  PropertyStatus,
} from '@/types/property'
import type { SearchFilters } from '@/types/search'
import { cityForRegion } from '@/utils/location'

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

function mapProperty(value: unknown): Property {
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
    district: (r.district as string | null) ?? null,
    latitude: (r.latitude as number | null) ?? null,
    longitude: (r.longitude as number | null) ?? null,
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
          telegram: ((r.owner as Record<string, unknown>).telegram as string | null) ?? null,
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

export function toQueryParams(filters: Partial<SearchFilters> = {}): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  if (filters.listingType) params.listingType = filters.listingType
  if (filters.query?.trim()) params.q = filters.query.trim()
  if (filters.region) {
    const city = cityForRegion(filters.region)
    if (city) params.city = city
  }
  if (filters.minPrice?.trim()) params.minPrice = Number(filters.minPrice)
  if (filters.maxPrice?.trim()) params.maxPrice = Number(filters.maxPrice)
  if (filters.rooms) {
    params.rooms = filters.rooms === '5' ? 5 : Number(filters.rooms)
  }
  if (filters.district?.trim()) params.district = filters.district.trim()
  if (filters.categorySlug) params.category = filters.categorySlug

  return params
}

export async function fetchProperties(
  filters: Partial<SearchFilters> = {},
  page = 1,
  limit = 12,
  sort: 'newest' | 'oldest' | 'price_asc' | 'price_desc' = 'newest',
): Promise<PropertyPage> {
  try {
    const params = { ...toQueryParams(filters), page, limit, sort }
    const { data } = await apiClient.get('/properties', { params })
    const payload = data as Record<string, unknown>
    return {
      items: Array.isArray(payload.items)
        ? payload.items.map(mapProperty)
        : [],
      total: Number(payload.total ?? 0),
      page: Number(payload.page ?? page),
      limit: Number(payload.limit ?? limit),
      totalPages: Number(payload.totalPages ?? 1),
    }
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

export async function uploadPropertyImages(
  id: number,
  files: File[],
): Promise<Property> {
  try {
    const form = new FormData()
    files.forEach((file) => form.append('images', file))
    const { data } = await apiClient.post(`/properties/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return mapProperty(data)
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

export async function fetchMyProperties(): Promise<PropertyPage> {
  try {
    const { data } = await apiClient.get('/properties/mine')
    const payload = data as Record<string, unknown>
    return {
      items: Array.isArray(payload.items) ? payload.items.map(mapProperty) : [],
      total: Number(payload.total ?? 0),
      page: Number(payload.page ?? 1),
      limit: Number(payload.limit ?? 12),
      totalPages: Number(payload.totalPages ?? 1),
    }
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export { resolveImageUrl, CURRENCY_MAP }
