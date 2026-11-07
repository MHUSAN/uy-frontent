import { apiClient, normalizeApiError } from '@/api/client'

export interface Inquiry {
  id: number
  message: string
  phone: string
  createdAt: string
  sender?: { id: number; fullName: string; phone?: string | null; telegram?: string | null }
  property: {
    id: number
    title: string
    price: number
    currency: string
    listingType: 'SALE' | 'RENT'
    city: string
    address: string
    status?: string
  }
}

export async function createInquiry(
  propertyId: number,
  payload: { message: string; phone: string },
): Promise<Inquiry> {
  try {
    const { data } = await apiClient.post(`/properties/${propertyId}/inquiries`, payload)
    return data as Inquiry
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function fetchSentInquiries(): Promise<Inquiry[]> {
  try {
    const { data } = await apiClient.get('/inquiries/my')
    return Array.isArray(data) ? (data as Inquiry[]) : []
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function fetchReceivedInquiries(): Promise<Inquiry[]> {
  try {
    const { data } = await apiClient.get('/inquiries/received')
    return Array.isArray(data) ? (data as Inquiry[]) : []
  } catch (error) {
    throw normalizeApiError(error)
  }
}
