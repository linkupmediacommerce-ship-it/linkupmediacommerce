import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { api, apiErrorMessage } from '../../lib/api'
import type { AdminUser } from '../../lib/types'
import { Spinner } from '../../components/Spinner'
import { Badge } from '../../components/Badge'

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/admin/users')
      .then((res) => setUsers(res.data.users))
      .catch((e) => setError(apiErrorMessage(e, '회원 정보를 불러오지 못했습니다.')))
  }, [])

  if (error) return <p className="text-center text-red-500 py-16">{error}</p>
  if (!users) return <Spinner />

  return (
    <div className="overflow-x-auto bg-white border border-neutral-200 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-500 text-left">
          <tr>
            <th className="px-4 py-3">이름</th>
            <th className="px-4 py-3">이메일</th>
            <th className="px-4 py-3">연락처</th>
            <th className="px-4 py-3">가입방법</th>
            <th className="px-4 py-3">가입일</th>
            <th className="px-4 py-3">예약수</th>
            <th className="px-4 py-3">권한</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-neutral-100">
              <td className="px-4 py-3 font-medium">{u.name}</td>
              <td className="px-4 py-3">{u.email || '-'}</td>
              <td className="px-4 py-3">{u.phone || '-'}</td>
              <td className="px-4 py-3">
                {u.auth_provider === 'kakao' ? (
                  <span className="text-[11px] font-semibold text-[#191919] bg-[#FEE500] rounded-full px-2 py-0.5">
                    카카오
                  </span>
                ) : u.auth_provider === 'naver' ? (
                  <span className="text-[11px] font-semibold text-white bg-[#03C75A] rounded-full px-2 py-0.5">
                    네이버
                  </span>
                ) : u.auth_provider === 'google' ? (
                  <span className="text-[11px] font-semibold text-neutral-700 bg-neutral-100 rounded-full px-2 py-0.5">
                    구글
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-50 rounded-full px-2 py-0.5">
                    이메일
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-neutral-400">{dayjs(u.created_at).format('YYYY-MM-DD')}</td>
              <td className="px-4 py-3">{u.reservation_count}</td>
              <td className="px-4 py-3">
                {u.role === 'super_admin' ? (
                  <Badge variant="admin">최고관리자</Badge>
                ) : u.role === 'brand_admin' ? (
                  <Badge variant="admin">브랜드관리자{u.brand_id ? ` #${u.brand_id}` : ''}</Badge>
                ) : (
                  '일반회원'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
