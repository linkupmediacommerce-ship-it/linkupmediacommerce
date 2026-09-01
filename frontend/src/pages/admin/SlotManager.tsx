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
  const [capacity, setCapacity] = useState('1')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingCapacity, setEditingCapacity] = useState('1')

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
        end_time: endTime,
        capacity: Number(capacity)
      })
      toast('시간대가 추가되었습니다.', 'success')
      setSlotDate('')
      setStartTime('')
      setEndTime('')
      setCapacity('1')
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

  function startEdit(s: AdminTimeSlot) {
    setEditingId(s.id)
    setEditingCapacity(String(s.capacity))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingCapacity('1')
  }

  async function saveCapacity(id: number) {
    try {
      await api.patch(`/admin/slots/${id}`, { capacity: Number(editingCapacity) })
      toast('인원수가 변경되었습니다.', 'success')
      cancelEdit()
      load()
    } catch (err) {
      toast(apiErrorMessage(err, '변경에 실패했습니다.'), 'error')
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
        <div>
          <label className="block text-xs text-neutral-500 mb-1">인원수</label>
          <input
            type="number"
            min={1}
            required
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm w-20"
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
                {grouped[d].map((s) => {
                  const isFull = s.reserved_count >= s.capacity
                  const isEditing = editingId === s.id
                  return (
                    <span
                      key={s.id}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
                        s.reserved_count > 0
                          ? isFull
                            ? 'bg-red-50 border-red-200'
                            : 'bg-amber-50 border-amber-200'
                          : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      {s.start_time}~{s.end_time}

                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            min={1}
                            autoFocus
                            value={editingCapacity}
                            onChange={(e) => setEditingCapacity(e.target.value)}
                            className="w-14 border border-neutral-300 rounded px-1 py-0.5 text-xs"
                          />
                          <button onClick={() => saveCapacity(s.id)} className="text-green-600 hover:text-green-800">
                            <i className="fa-solid fa-check" />
                          </button>
                          <button onClick={cancelEdit} className="text-neutral-400 hover:text-neutral-700">
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(s)}
                            className={`flex items-center gap-1 hover:underline ${isFull ? 'text-red-600 font-semibold' : 'text-neutral-500'}`}
                            title="인원수 수정"
                          >
                            <i className="fa-solid fa-user text-[10px]" />
                            {s.reserved_count}/{s.capacity}
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="text-neutral-400 hover:text-red-500 ml-1">
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
