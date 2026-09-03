import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function Layout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    toast('로그아웃 되었습니다.')
    navigate('/showrooms')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/showrooms" className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">all4run</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link to="/showrooms" className="px-3 py-2 rounded-lg hover:bg-neutral-100 transition">쇼룸 목록</Link>
            {user ? (
              <>
                <Link to="/my" className="px-3 py-2 rounded-lg hover:bg-neutral-100 transition">내 예약</Link>
                {(user.role === 'super_admin' || user.role === 'brand_admin') && (
                  <Link to="/admin" className="px-3 py-2 rounded-lg hover:bg-neutral-100 transition text-amber-700">관리자</Link>
                )}
                <span className="text-neutral-400 mx-1">|</span>
                <span className="text-neutral-600 hidden sm:inline">{user.name}님</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-3 py-2 rounded-lg hover:bg-neutral-100 transition">로그인</Link>
                <Link to="/signup" className="px-3 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 transition">회원가입</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400">
        © 2026 all4run. All rights reserved.
      </footer>
    </div>
  )
}
