import { apiClient, normalizeApiError } from '@/api/client'
import type { User } from '@/types/auth'

const TOKEN_KEY = 'tezuy.token'

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore storage errors.
  }
}

export interface AuthResponse {
  user: User
  accessToken: string
}

/** Registration returns the created user and NO token: the user logs in afterwards. */
export async function registerUser(payload: {
  fullName: string
  email: string
  password: string
  phone?: string
}): Promise<User> {
  try {
    const { data } = await apiClient.post<User>('/auth/register', payload)
    return data
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function loginUser(payload: {
  email: string
  password: string
}): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
    return data
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function fetchCurrentUser(): Promise<User> {
  try {
    const { data } = await apiClient.get<User>('/auth/me')
    return data
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function updateCurrentUser(payload: {
  fullName?: string
  phone?: string
}): Promise<User> {
  try {
    const { data } = await apiClient.patch<User>('/users/me', payload)
    return data
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function fetchMyProfile(): Promise<User> {
  try {
    const { data } = await apiClient.get<User>('/users/me')
    return data
  } catch (error) {
    throw normalizeApiError(error)
  }
}
