import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './Spinner'

export function ProtectedRoute({
  children,
  adminOnly = false,
  superAdminOnly = false
}: {
  children: ReactNode
  adminOnly?: boolean
  superAdminOnly?: boolean
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  const isAdmin = user.role === 'super_admin' || user.role === 'brand_admin'
  if (adminOnly && !isAdmin) {
    return <Navigate to="/showrooms" replace />
  }

  if (superAdminOnly && user.role !== 'super_admin') {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}
