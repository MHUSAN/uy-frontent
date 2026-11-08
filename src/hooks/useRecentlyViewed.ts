import { useSyncExternalStore } from 'react'

import type { PropertyCardData } from '@/types/property'

const KEY = 'tezuy.recent'
const MAX = 6
const listeners = new Set<() => void>()
let snapshot: PropertyCardData[] | null = null
const EMPTY: PropertyCardData[] = []

function read(): PropertyCardData[] {
  if (snapshot) return snapshot
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    snapshot = Array.isArray(parsed) ? (parsed as PropertyCardData[]).slice(0, MAX) : EMPTY
  } catch {
    snapshot = EMPTY
  }
  return snapshot
}

function write(next: PropertyCardData[]) {
  snapshot = next.length ? next : EMPTY
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage is optional.
  }
  listeners.forEach((listener) => listener())
}

/** Remembers the last viewed listings (card fields only) in this browser. */
export function rememberViewed(property: PropertyCardData) {
  const card: PropertyCardData = {
    id: property.id,
    title: property.title,
    price: property.price,
    currency: property.currency,
    listingType: property.listingType,
    address: property.address,
    city: property.city,
    area: property.area,
    rooms: property.rooms,
    bathrooms: property.bathrooms,
    images: property.images?.slice(0, 1),
    status: property.status,
    createdAt: property.createdAt,
  }
  write([card, ...read().filter((item) => item.id !== card.id)].slice(0, MAX))
}

export function clearRecentlyViewed() {
  write([])
}

export function useRecentlyViewed(): PropertyCardData[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => EMPTY,
  )
}
