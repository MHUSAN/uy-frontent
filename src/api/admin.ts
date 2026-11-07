import { apiClient, normalizeApiError } from '@/api/client'
import type { Category } from '@/types/property'

export async function adminListProperties(status?: string, page = 1, limit = 20) {
  try {
    const { data } = await apiClient.get('/admin/properties', {
      params: { status, page, limit },
    })
    return data as any
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

export async function adminListUsers() {
  try {
    const { data } = await apiClient.get('/admin/users')
    return data as any
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
