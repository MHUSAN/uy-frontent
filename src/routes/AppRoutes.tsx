import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { RootLayout } from '@/layouts/RootLayout'
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })))
import { HomePage } from '@/pages/HomePage'
const InquiriesPage = lazy(() => import('@/pages/InquiriesPage').then((m) => ({ default: m.InquiriesPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
import { NotFoundPage } from '@/pages/NotFoundPage'
const PropertyDetailPage = lazy(() => import('@/pages/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })))
const PropertyFormPage = lazy(() => import('@/pages/PropertyFormPage').then((m) => ({ default: m.PropertyFormPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const SellerDashboardPage = lazy(() => import('@/pages/SellerDashboardPage').then((m) => ({ default: m.SellerDashboardPage })))
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
