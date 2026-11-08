import {
  EMPTY_FILTERS,
  sanitizeNumericInput,
  type SearchFilters,
  type SortValue,
} from '@/types/search'

const SORTS: SortValue[] = ['newest', 'price_asc', 'price_desc']

/** URL keys mirror the API's query parameter names. */
export function readFilters(params: URLSearchParams): SearchFilters {
  const type = params.get('type')
  const rooms = params.get('rooms') ?? ''
  const sort = params.get('sort') as SortValue | null
  return {
    ...EMPTY_FILTERS,
    city: params.get('city') ?? '',
    listingType: type === 'SALE' || type === 'RENT' ? type : '',
    categorySlug: params.get('category') ?? '',
    minPrice: sanitizeNumericInput(params.get('minPrice') ?? ''),
    maxPrice: sanitizeNumericInput(params.get('maxPrice') ?? ''),
    rooms: /^[1-9]$/.test(rooms) ? rooms : '',
    sort: sort && SORTS.includes(sort) ? sort : 'newest',
  }
}

export function readPage(params: URLSearchParams): number {
  const page = Number(params.get('page'))
  return Number.isInteger(page) && page >= 1 ? page : 1
}

export function writeFilters(
  filters: SearchFilters,
  page = 1,
): Record<string, string> {
  const entries: Array<[string, string]> = [
    ['city', filters.city.trim()],
    ['type', filters.listingType],
    ['category', filters.categorySlug],
    ['minPrice', filters.minPrice],
    ['maxPrice', filters.maxPrice],
    ['rooms', filters.rooms],
    ['sort', filters.sort === 'newest' ? '' : filters.sort],
    ['page', page > 1 ? String(page) : ''],
  ]
  return Object.fromEntries(entries.filter(([, value]) => value))
}
