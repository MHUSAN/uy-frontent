export type ListingType = 'SALE' | 'RENT'
export type PropertyStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface Category {
  id: number
  name: string
  slug: string
}

export interface PropertyImage {
  id: number
  url: string
  altText?: string | null
  sortOrder: number
}

export interface PropertyOwner {
  id: number
  fullName: string
  phone?: string | null
  telegram?: string | null
}

export interface Property {
  id: number
  title: string
  description: string
  price: number
  currency: string
  listingType: ListingType
  status?: PropertyStatus
  address: string
  city: string
  district?: string | null
  latitude?: number | null
  longitude?: number | null
  area: number
  rooms: number
  bathrooms: number
  createdAt: string
  updatedAt?: string
  images?: PropertyImage[]
  category?: Category | null
  owner?: PropertyOwner | null
  ownerId?: number
}

export type PropertyCardData = Pick<
  Property,
  | 'id'
  | 'title'
  | 'price'
  | 'currency'
  | 'listingType'
  | 'address'
  | 'city'
  | 'area'
  | 'rooms'
  | 'images'
  | 'status'
>
