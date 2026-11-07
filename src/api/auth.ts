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

export async function registerUser(payload: {
  fullName: string
  email: string
  password: string
}): Promise<{ requiresVerification: true; email: string; retryAfterSeconds: number }> {
  try {
    const { data } = await apiClient.post<{ requiresVerification: true; email: string; retryAfterSeconds: number }>('/auth/register', payload)
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
  telegram?: string
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

export async function submitAuthCode(action: 'verify-email' | 'resend-otp' | 'forgot-password' | 'reset-password', payload: { email: string; code?: string; password?: string }): Promise<{ success?: boolean; retryAfterSeconds?: number }> {
  try {
    return (await apiClient.post(`/auth/${action}`, payload)).data
  } catch (error) { throw normalizeApiError(error) }
}
