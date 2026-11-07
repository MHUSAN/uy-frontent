import { isRegionId, REGION_IDS, type RegionId } from '@/types/location'

export const REGION_CITY_NAMES: Record<RegionId, string> = {
  tashkentCity: 'Toshkent shahri',
  tashkentRegion: 'Toshkent viloyati',
  andijan: 'Andijon',
  bukhara: 'Buxoro',
  fergana: 'Farg\u2018ona',
  jizzakh: 'Jizzax',
  khorezm: 'Xorazm',
  namangan: 'Namangan',
  navoiy: 'Navoiy',
  kashkadarya: 'Qashqadaryo',
  samarkand: 'Samarqand',
  syrdarya: 'Sirdaryo',
  surkhandarya: 'Surxondaryo',
  karakalpakstan: 'Qoraqalpog\u2018iston Respublikasi',
}

export function cityForRegion(region: RegionId | string | null | undefined): string | undefined {
  if (!region || !isRegionId(region)) return undefined
  return REGION_CITY_NAMES[region]
}

export function regionForCity(city: string | null | undefined): RegionId | null {
  if (!city) return null
  return REGION_IDS.find((r) => REGION_CITY_NAMES[r] === city) ?? null
}
