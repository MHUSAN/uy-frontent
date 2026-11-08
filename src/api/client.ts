import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

// Development defaults to /api, which Vite proxies to the NestJS server.
export const API_BASE_URL = configuredBaseUrl || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Free hosting may need up to ~50s to wake the backend: be patient.
  timeout: 45_000,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  try {
    const token = window.localStorage.getItem('tezuy.token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Storage access can fail in private browsing; just continue.
  }
  return config
})

export function normalizeApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const message =
      (error.response?.data as { message?: string | string[] } | undefined)
        ?.message ?? error.message
    const normalized = Array.isArray(message)
      ? message.join(', ')
      : String(message)
    const err = new Error(normalized)
    Object.assign(err, {
      status: error.response?.status,
      code: error.response?.data?.code,
      retryAfterSeconds: error.response?.data?.retryAfterSeconds,
    })
    return err
  }
  return error instanceof Error ? error : new Error('Unknown error')
}

const RETRY_DELAYS = [2_000, 5_000, 10_000]

function isColdStart(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status === 502 || status === 503 || status === 504 || (!error.response && error.code !== 'ERR_CANCELED')
}

// GET requests are safe to repeat while the backend wakes up.
apiClient.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as (typeof error.config & { __retry?: number }) | undefined
  if (!config || config.method !== 'get' || !isColdStart(error)) throw error
  const attempt = config.__retry ?? 0
  if (attempt >= RETRY_DELAYS.length) throw error
  config.__retry = attempt + 1
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
  return apiClient.request(config)
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined
    if (
      status === 401 &&
      error.config?.headers?.Authorization &&
      !error.config?.url?.match(
        /\/auth\/(login|register|verify-email|resend-otp|forgot-password|reset-password)/,
      )
    ) {
      try {
        const token = window.localStorage.getItem('tezuy.token')
        // An older request must not clear a newly signed-in session.
        if (error.config.headers.Authorization === `Bearer ${token}`) {
          window.localStorage.removeItem('tezuy.token')
          window.dispatchEvent(new Event('tezuy:unauthorized'))
        }
      } catch {
        // Ignore.
      }
    }
    return Promise.reject(error)
  },
)

export function resolveImageUrl(url?: string | null): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  try {
    const base = API_BASE_URL
    if (/^https?:\/\//i.test(base)) {
      return new URL(url, base).toString()
    }
  } catch {
    // Fall back to relative URL.
  }
  return url
}
