import { isRegionId } from '@/types/location'
import {
  EMPTY_FILTERS,
  sanitizeNumericInput,
  type SearchFilters,
} from '@/types/search'

const VALID_ROOM_VALUES = new Set(['1', '2', '3', '4', '5'])

export function readFilters(params: URLSearchParams): SearchFilters {
  const listingType = params.get('type')
  const region = params.get('region')
  const rooms = params.get('rooms') ?? ''

  return {
    ...EMPTY_FILTERS,
    query: params.get('q') ?? '',
    listingType: listingType === 'RENT' ? 'RENT' : 'SALE',
    region: isRegionId(region) ? region : '',
    categorySlug: params.get('category') ?? '',
    minPrice: sanitizeNumericInput(params.get('min') ?? ''),
    maxPrice: sanitizeNumericInput(params.get('max') ?? ''),
    rooms: VALID_ROOM_VALUES.has(rooms) ? rooms : '',
    district: params.get('district') ?? '',
  }
}

export function writeFilters(filters: SearchFilters): Record<string, string> {
  const params: Record<string, string> = {
    type: filters.listingType,
  }

  const optionalValues: Array<[string, string]> = [
    ['q', filters.query.trim()],
    ['region', filters.region],
    ['category', filters.categorySlug],
    ['min', filters.minPrice],
    ['max', filters.maxPrice],
    ['rooms', filters.rooms],
    ['district', filters.district],
  ]

  for (const [key, value] of optionalValues) {
    if (value) {
      params[key] = value
    }
  }

  return params
}
