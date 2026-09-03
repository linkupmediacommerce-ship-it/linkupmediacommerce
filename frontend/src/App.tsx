import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import { useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ShowroomList } from './pages/ShowroomList'
import { ShowroomDetail } from './pages/ShowroomDetail'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { MyReservations } from './pages/MyReservations'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminReservations } from './pages/admin/AdminReservations'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminShowrooms } from './pages/admin/AdminShowrooms'
import { AdminBrands } from './pages/admin/AdminBrands'

function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="text-2xl font-bold mb-2">페이지를 찾을 수 없습니다</p>
      <a href="#/showrooms" className="text-amber-600 hover:underline">
        쇼룸 목록으로 이동
      </a>
    </div>
  )
}

function IndexRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  const isAdmin = user?.role === 'super_admin' || user?.role === 'brand_admin'
  return <Navigate to={isAdmin ? '/admin' : '/showrooms'} replace />
}

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<IndexRedirect />} />
          <Route path="showrooms" element={<ShowroomList />} />
          <Route path="showrooms/:id" element={<ShowroomDetail />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route
            path="my"
            element={
              <ProtectedRoute>
                <MyReservations />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="reservations" replace />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="showrooms" element={<AdminShowrooms />} />
            <Route
              path="brands"
              element={
                <ProtectedRoute superAdminOnly>
                  <AdminBrands />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}

export default App
