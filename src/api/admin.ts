import { apiClient, normalizeApiError } from '@/api/client'
import { mapProperty, type PropertyPage } from '@/api/properties'
import type { User } from '@/types/auth'
import type { Category } from '@/types/property'

export async function adminListProperties(status?: string, page = 1, limit = 20, ownerId?: number) {
  try {
    const { data } = await apiClient.get('/admin/properties', {
      params: { status, page, limit, ownerId },
    })
    return { ...data, items: data.items.map(mapProperty) } as PropertyPage
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export interface AdminStats {
  properties: number
  pending: number
  approved: number
  rejected: number
  users: number
  categories: number
  inquiries: number
  favorites: number
}

export async function adminStats(): Promise<AdminStats> {
  try {
    const { data } = await apiClient.get<AdminStats>('/admin/stats')
    return data
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function adminSetStatus(id: number, status: string) {
  try {
    const { data } = await apiClient.patch(`/admin/properties/${id}/status`, { status })
    return data as any
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function adminListUsers(
  page = 1,
  q?: string,
  role?: 'USER' | 'ADMIN',
) {
  try {
    const { data } = await apiClient.get('/admin/users', {
      params: { page, limit: 20, ...(q ? { q } : {}), ...(role ? { role } : {}) },
    })
    return data as { items: User[]; total: number; totalPages: number }
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function adminDeleteUser(id: number) {
  try { await apiClient.delete(`/admin/users/${id}`) }
  catch (error) { throw normalizeApiError(error) }
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
