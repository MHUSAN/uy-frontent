import type { ListingType } from '@/types/property'

export type SortValue = 'newest' | 'price_asc' | 'price_desc'

export interface SearchFilters {
  city: string
  /** Empty string means "all". */
  listingType: ListingType | ''
  categorySlug: string
  minPrice: string
  maxPrice: string
  rooms: string
  sort: SortValue
}

export const EMPTY_FILTERS: SearchFilters = {
  city: '',
  listingType: '',
  categorySlug: '',
  minPrice: '',
  maxPrice: '',
  rooms: '',
  sort: 'newest',
}

export function parsePrice(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function sanitizeNumericInput(value: string): string {
  return value.replace(/[^\d]/g, '')
}

export function hasInvalidPriceRange(filters: SearchFilters): boolean {
  const min = parsePrice(filters.minPrice)
  const max = parsePrice(filters.maxPrice)
  return min !== null && max !== null && min > max
}

export function countActiveFilters(filters: SearchFilters): number {
  return [
    filters.city.trim(),
    filters.listingType,
    filters.categorySlug,
    filters.minPrice,
    filters.maxPrice,
    filters.rooms,
  ].filter(Boolean).length
}
