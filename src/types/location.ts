export const REGION_IDS = [
  'tashkentCity',
  'tashkentRegion',
  'andijan',
  'bukhara',
  'fergana',
  'jizzakh',
  'khorezm',
  'namangan',
  'navoiy',
  'kashkadarya',
  'samarkand',
  'syrdarya',
  'surkhandarya',
  'karakalpakstan',
] as const

export type RegionId = (typeof REGION_IDS)[number]

export interface Region {
  id: RegionId
  /** Translation key under `regions.*`. */
  nameKey: `regions.${RegionId}`
}

export const REGIONS: Region[] = REGION_IDS.map((id) => ({
  id,
  nameKey: `regions.${id}`,
}))

/**
 * District data is intentionally empty until the backend exposes a verified
 * location source. The UI and types are ready for dependent selection; no
 * district names are invented here.
 */
export interface District {
  id: string
  nameKey: string
}

export const DISTRICTS_BY_REGION: Record<RegionId, District[]> = {
  tashkentCity: [],
  tashkentRegion: [],
  andijan: [],
  bukhara: [],
  fergana: [],
  jizzakh: [],
  khorezm: [],
  namangan: [],
  navoiy: [],
  kashkadarya: [],
  samarkand: [],
  syrdarya: [],
  surkhandarya: [],
  karakalpakstan: [],
}

export function isRegionId(value: unknown): value is RegionId {
  return (
    typeof value === 'string' &&
    (REGION_IDS as readonly string[]).includes(value)
  )
}

export function getDistricts(region: RegionId | ''): District[] {
  return region ? DISTRICTS_BY_REGION[region] : []
}
