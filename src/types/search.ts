import type { ListingType } from '@/types/property'
import type { RegionId } from '@/types/location'

export interface SearchFilters {
  query: string
  listingType: ListingType
  region: RegionId | ''
  categorySlug: string
  minPrice: string
  maxPrice: string
  rooms: string
  district: string
}

export const EMPTY_FILTERS: SearchFilters = {
  query: '',
  listingType: 'SALE',
  region: '',
  categorySlug: '',
  minPrice: '',
  maxPrice: '',
  rooms: '',
  district: '',
}

export function parsePrice(value: string): number | null {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function sanitizeNumericInput(value: string): string {
  return value.replace(/[^\d]/g, '')
}
