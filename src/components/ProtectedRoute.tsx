import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { t } = useTranslation()
  const auth = useAuth()
  const location = useLocation()

  if (auth.loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-12 text-sm text-muted">
        {t('authFlow.loading')}
      </div>
    )
  }

  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireAdmin && auth.user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
