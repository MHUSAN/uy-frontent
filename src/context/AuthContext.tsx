import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { fetchCurrentUser, getStoredToken, setStoredToken } from '@/api/auth'
import type { User } from '@/types/auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  refresh: () => Promise<void>
}

const USER_KEY = 'tezuy.user'
function readUser(): User | null {
  try {
    return getStoredToken()
      ? (JSON.parse(window.localStorage.getItem(USER_KEY) || 'null') as User | null)
      : null
  } catch {
    return null
  }
}
function writeUser(user: User | null) {
  try {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user))
    else window.localStorage.removeItem(USER_KEY)
  } catch {
    /* optional */
  }
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => readUser())
  const setUser = useCallback((next: User | null) => {
    writeUser(next)
    setUserState(next)
  }, [])
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [loading, setLoading] = useState<boolean>(
    () => Boolean(getStoredToken()) && !readUser(),
  )

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setLoading(false)
      return
    }
    fetchCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch((error: Error & { status?: number }) => {
        if (!cancelled && error.status === 401) {
          setStoredToken(null)
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, setUser])

  useEffect(() => {
    const clear = () => {
      setToken(null)
      setUser(null)
      setLoading(false)
    }
    const sync = (event: StorageEvent) => {
      if (event.key === 'tezuy.token') {
        setToken(getStoredToken())
        setUser(null)
        setLoading(true)
      }
    }
    window.addEventListener('tezuy:unauthorized', clear)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('tezuy:unauthorized', clear)
      window.removeEventListener('storage', sync)
    }
  }, [setUser])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login: (nextToken: string, nextUser: User) => {
        setStoredToken(nextToken)
        setToken(nextToken)
        setUser(nextUser)
        setLoading(false)
      },
      logout: () => {
        setLoading(false)
        setStoredToken(null)
        setToken(null)
        setUser(null)
      },
      refresh: async () => {
        const u = await fetchCurrentUser()
        setUser(u)
      },
    }),
    [user, token, loading, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
