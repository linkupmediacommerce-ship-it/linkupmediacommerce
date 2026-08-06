import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { AdminTimeSlot } from '../../lib/types'
import { Spinner } from '../../components/Spinner'
import { formatDateLabel } from '../../lib/date'
import { useToast } from '../../context/ToastContext'

export function SlotManager({ showroomId }: { showroomId: number }) {
  const toast = useToast()
  const [slots, setSlots] = useState<AdminTimeSlot[] | null>(null)
  const [slotDate, setSlotDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const load = useCallback(() => {
    api.get(`/admin/showrooms/${showroomId}/slots`).then((res) => setSlots(res.data.slots))
  }, [showroomId])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => {
    const map: Record<string, AdminTimeSlot[]> = {}
    ;(slots || []).forEach((s) => {
      map[s.slot_date] = map[s.slot_date] || []
      map[s.slot_date].push(s)
    })
    return map
  }, [slots])
  const dates = useMemo(() => Object.keys(grouped).sort(), [grouped])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    try {
      await api.post(`/admin/showrooms/${showroomId}/slots`, {
        slot_date: slotDate,
        start_time: startTime,
        end_time: endTime
      })
      toast('시간대가 추가되었습니다.', 'success')
      setSlotDate('')
      setStartTime('')
      setEndTime('')
      load()
    } catch (err) {
      toast(apiErrorMessage(err, '추가에 실패했습니다.'), 'error')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('이 시간대를 삭제하시겠습니까?')) return
    try {
      await api.delete(`/admin/slots/${id}`)
      toast('삭제되었습니다.', 'success')
      load()
    } catch (err) {
      toast(apiErrorMessage(err, '삭제에 실패했습니다.'), 'error')
    }
  }

  if (!slots) return <Spinner />

  return (
    <div className="border-t border-neutral-200 pt-4 mt-2">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4 items-end">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">날짜</label>
          <input
            type="date"
            required
            value={slotDate}
            onChange={(e) => setSlotDate(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">시작</label>
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">종료</label>
          <input
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-neutral-900 text-white hover:bg-neutral-700 transition">
          시간대 추가
        </button>
      </form>

      <div className="space-y-3">
        {dates.length === 0 ? (
          <p className="text-neutral-400 text-sm">등록된 시간대가 없습니다.</p>
        ) : (
          dates.map((d) => (
            <div key={d}>
              <p className="text-xs font-bold text-neutral-500 mb-1.5">{formatDateLabel(d)}</p>
              <div className="flex flex-wrap gap-1.5">
                {grouped[d].map((s) => (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
                      s.reservation_id ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    {s.start_time}~{s.end_time} {s.reservation_id && <i className="fa-solid fa-user text-amber-600" />}
                    <button onClick={() => handleDelete(s.id)} className="text-neutral-400 hover:text-red-500 ml-1">
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
