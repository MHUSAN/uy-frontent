import { apiClient, normalizeApiError } from '@/api/client'
import { mapPage, type PropertyPage } from '@/api/properties'
import type { User } from '@/types/auth'
import type { Category, PropertyStatus } from '@/types/property'

export async function adminListProperties(status?: PropertyStatus, page = 1, limit = 12): Promise<PropertyPage> {
  try {
    const { data } = await apiClient.get('/admin/properties', {
      params: { ...(status ? { status } : {}), page, limit },
    })
    return mapPage(data, page, limit)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function adminSetStatus(id: number, status: 'APPROVED' | 'REJECTED') {
  try {
    const { data } = await apiClient.patch(`/admin/properties/${id}/status`, { status })
    return data as unknown
  } catch (error) {
    throw normalizeApiError(error)
  }
}

/** GET /admin/users returns a plain array, newest first. */
export async function adminListUsers(): Promise<User[]> {
  try {
    const { data } = await apiClient.get('/admin/users')
    return Array.isArray(data) ? (data as User[]) : []
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function createCategory(payload: { name: string; slug: string }) {
  try {
    const { data } = await apiClient.post('/categories', payload)
    return data as Category
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function updateCategory(id: number, payload: { name?: string; slug?: string }) {
  try {
    const { data } = await apiClient.patch(`/categories/${id}`, payload)
    return data as Category
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function deleteCategory(id: number) {
  try {
    await apiClient.delete(`/categories/${id}`)
  } catch (error) {
    throw normalizeApiError(error)
  }
}
