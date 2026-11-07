import type { TFunction } from 'i18next'
import type { Category } from '@/types/property'
import { REGION_CITY_NAMES } from '@/utils/location'

// Only application-defined canonical slugs have bundled translations. Custom
// administrator names and user-entered text are never machine-translated.
const CATEGORY_KEYS: Record<string, string> = {
  apartment: 'apartments',
  apartments: 'apartments',
  house: 'houses',
  houses: 'houses',
  land: 'land',
  commercial: 'commercial',
}
export function categoryLabel(category: Category, t: TFunction): string {
  const key = CATEGORY_KEYS[category.slug]
  return key ? t(`categoryLabels.${key}`) : category.name
}
export function locationLabel(city: string, t: TFunction): string {
  const region = Object.entries(REGION_CITY_NAMES).find(
    ([, name]) => name === city,
  )?.[0]
  return region ? t(`regions.${region}`) : city
}
