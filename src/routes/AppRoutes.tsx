import { Navigate, Route, Routes } from 'react-router-dom'

import { RootLayout } from '@/layouts/RootLayout'
import { AuthPage } from '@/pages/AuthPage'
import { AdminPage } from '@/pages/AdminPage'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { HomePage } from '@/pages/HomePage'
import { InquiriesPage } from '@/pages/InquiriesPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PropertyDetailPage } from '@/pages/PropertyDetailPage'
import { PropertyFormPage } from '@/pages/PropertyFormPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SellerDashboardPage } from '@/pages/SellerDashboardPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="kirish" element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="admin/login" element={<Navigate to="/login" replace />} />
        <Route path="verify-email" element={<AuthPage key="verify" mode="verify" />} />
        <Route path="forgot-password" element={<AuthPage key="forgot" mode="forgot" />} />
        <Route path="reset-password" element={<AuthPage key="reset" mode="reset" />} />
        <Route path="elonlar/:id" element={<PropertyDetailPage />} />
        <Route
          path="elonlar/:id/tahrir"
          element={
            <ProtectedRoute>
              <PropertyFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="elon-berish"
          element={
            <ProtectedRoute>
              <PropertyFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sevimlilar"
          element={
            <ProtectedRoute>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="so'rovlar"
          element={
            <ProtectedRoute>
              <InquiriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <SellerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
