import { useCallback, useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { AdminReservation, Showroom } from '../../lib/types'
import { Spinner } from '../../components/Spinner'
import { Badge } from '../../components/Badge'
import { formatDateLabel } from '../../lib/date'
import { useToast } from '../../context/ToastContext'

export function AdminReservations() {
  const toast = useToast()
  const [reservations, setReservations] = useState<AdminReservation[] | null>(null)
  const [showrooms, setShowrooms] = useState<Showroom[]>([])
  const [error, setError] = useState<string | null>(null)

  const [filterShowroom, setFilterShowroom] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const load = useCallback((params?: Record<string, string>) => {
    api
      .get('/admin/reservations', { params })
      .then((res) => setReservations(res.data.reservations))
      .catch((e) => setError(apiErrorMessage(e, '예약 정보를 불러오지 못했습니다.')))
  }, [])

  useEffect(() => {
    api.get('/admin/showrooms').then((res) => setShowrooms(res.data.showrooms))
    load()
  }, [load])

  function applyFilter() {
    const params: Record<string, string> = {}
    if (filterShowroom) params.showroom_id = filterShowroom
    if (filterStatus) params.status = filterStatus
    if (filterDate) params.date = filterDate
    load(params)
  }

  async function handleAction(id: number, action: 'cancel' | 'restore' | 'delete') {
    try {
      if (action === 'cancel') {
        await api.patch(`/admin/reservations/${id}`, { status: 'cancelled' })
        toast('예약이 취소되었습니다.', 'success')
      } else if (action === 'restore') {
        await api.patch(`/admin/reservations/${id}`, { status: 'confirmed' })
        toast('예약이 복원되었습니다.', 'success')
      } else {
        if (!confirm('이 예약을 완전히 삭제하시겠습니까?')) return
        await api.delete(`/admin/reservations/${id}`)
        toast('예약이 삭제되었습니다.', 'success')
      }
      applyFilter()
    } catch (e) {
      toast(apiErrorMessage(e, '처리에 실패했습니다.'), 'error')
    }
  }

  if (error) return <p className="text-center text-red-500 py-16">{error}</p>
  if (!reservations) return <Spinner />

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterShowroom}
          onChange={(e) => setFilterShowroom(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">전체 지점</option>
          {showrooms.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="confirmed">예약확정</option>
          <option value="cancelled">취소됨</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
        />
        <button onClick={applyFilter} className="px-4 py-2 rounded-lg text-sm border border-neutral-200 bg-white hover:border-neutral-900 transition">
          필터 적용
        </button>
      </div>

      <div className="overflow-x-auto bg-white border border-neutral-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-left">
            <tr>
              <th className="px-4 py-3">지점</th>
              <th className="px-4 py-3">일시</th>
              <th className="px-4 py-3">예약자</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">메모</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-neutral-400 py-12">
                  예약 내역이 없습니다.
                </td>
              </tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.showroom_name}</td>
                  <td className="px-4 py-3">
                    {formatDateLabel(r.slot_date)} {r.start_time}
                  </td>
                  <td className="px-4 py-3">
                    {r.user_name}
                    <br />
                    <span className="text-xs text-neutral-400">{r.user_email}</span>
                  </td>
                  <td className="px-4 py-3">{r.user_phone || '-'}</td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <span className="text-neutral-600 whitespace-pre-wrap break-words">
                      {r.memo || <span className="text-neutral-300">-</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === 'confirmed' ? 'confirmed' : 'cancelled'}>
                      {r.status === 'confirmed' ? '예약확정' : '취소됨'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {r.status === 'confirmed' ? (
                        <button
                          onClick={() => handleAction(r.id, 'cancel')}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100"
                        >
                          취소
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(r.id, 'restore')}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100"
                        >
                          복원
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(r.id, 'delete')}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
