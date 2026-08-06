import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiErrorMessage } from '../lib/api'
import type { MyReservation } from '../lib/types'
import { Spinner } from '../components/Spinner'
import { Badge } from '../components/Badge'
import { formatDateLabel } from '../lib/date'
import { useToast } from '../context/ToastContext'

export function MyReservations() {
  const toast = useToast()
  const [reservations, setReservations] = useState<MyReservation[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .get('/reservations/my')
      .then((res) => setReservations(res.data.reservations))
      .catch((e) => setError(apiErrorMessage(e, '예약 내역을 불러오지 못했습니다.')))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCancel(id: number) {
    if (!confirm('예약을 취소하시겠습니까?')) return
    try {
      await api.delete(`/reservations/${id}`)
      toast('예약이 취소되었습니다.', 'success')
      load()
    } catch (e) {
      toast(apiErrorMessage(e, '예약 취소에 실패했습니다.'), 'error')
    }
  }

  if (error) return <p className="text-center text-red-500 py-24">{error}</p>
  if (!reservations) return <Spinner />

  return (
    <div className="fade-in max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">내 예약</h1>

      {reservations.length === 0 ? (
        <p className="text-neutral-400 text-center py-16">
          예약 내역이 없습니다.{' '}
          <Link to="/showrooms" className="text-amber-600 hover:underline">
            쇼룸 예약하러 가기
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <div key={r.id} className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">{r.showroom_name}</span>
                  <Badge variant={r.status === 'confirmed' ? 'confirmed' : 'cancelled'}>
                    {r.status === 'confirmed' ? '예약확정' : '취소됨'}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-500">
                  {formatDateLabel(r.slot_date)} {r.start_time} ~ {r.end_time}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  <i className="fa-solid fa-location-dot mr-1" />
                  {r.showroom_address}
                </p>
                {r.memo && <p className="text-xs text-neutral-400 mt-1">메모: {r.memo}</p>}
              </div>
              {r.status === 'confirmed' && (
                <button
                  onClick={() => handleCancel(r.id)}
                  className="px-4 py-2 rounded-lg text-sm border border-neutral-200 bg-white hover:border-neutral-900 transition shrink-0"
                >
                  예약 취소
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
