import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/admin/reservations', label: '예약 관리', icon: 'fa-calendar-check' },
  { to: '/admin/users', label: '회원 관리', icon: 'fa-users' },
  { to: '/admin/showrooms', label: '쇼룸 관리', icon: 'fa-store' }
]

export function AdminLayout() {
  return (
    <div className="fade-in">
      <h1 className="text-2xl font-bold mb-2">관리자 페이지</h1>
      <p className="text-neutral-500 mb-4">예약, 회원, 쇼룸을 관리합니다.</p>
      <div className="flex gap-2 mb-6 border-b border-neutral-200">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                isActive ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`
            }
          >
            <i className={`fa-solid ${tab.icon} mr-1.5`} />
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
