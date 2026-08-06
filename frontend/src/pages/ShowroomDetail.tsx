import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../lib/api'
import type { Showroom, TimeSlot } from '../lib/types'
import { Spinner } from '../components/Spinner'
import { formatDateLabel } from '../lib/date'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function ShowroomDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [showroom, setShowroom] = useState<Showroom | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    setShowroom(null)
    setSlots([])
    setSelectedSlot(null)
    setError(null)

    Promise.all([api.get(`/showrooms/${id}`), api.get(`/showrooms/${id}/slots`)])
      .then(([showroomRes, slotsRes]) => {
        setShowroom(showroomRes.data.showroom)
        const fetchedSlots: TimeSlot[] = slotsRes.data.slots
        setSlots(fetchedSlots)
        const dates = [...new Set(fetchedSlots.map((s) => s.slot_date))].sort()
        setSelectedDate(dates[0] ?? null)
      })
      .catch((e) => setError(apiErrorMessage(e, '쇼룸 정보를 불러오지 못했습니다.')))
  }, [id])

  const dates = useMemo(() => [...new Set(slots.map((s) => s.slot_date))].sort(), [slots])
  const slotsForDate = useMemo(
    () => slots.filter((s) => s.slot_date === selectedDate),
    [slots, selectedDate]
  )

  function handleSelectDate(date: string) {
    setSelectedDate(date)
    setSelectedSlot(null)
    setMemo('')
  }

  function handleSelectSlot(slot: TimeSlot) {
    setSelectedSlot(slot)
    setMemo('')
  }

  async function handleConfirm() {
    if (!selectedSlot) return
    if (!user) {
      const next = encodeURIComponent(`/showrooms/${id}`)
      toast('로그인이 필요합니다.', 'error')
      navigate(`/login?next=${next}`)
      return
    }
    setSubmitting(true)
    try {
      await api.post('/reservations', { time_slot_id: selectedSlot.id, memo })
      toast('예약이 완료되었습니다!', 'success')
      navigate('/my')
    } catch (e) {
      toast(apiErrorMessage(e, '예약에 실패했습니다.'), 'error')
      setSubmitting(false)
      // refresh slot availability
      if (id) {
        const res = await api.get(`/showrooms/${id}/slots`)
        setSlots(res.data.slots)
        setSelectedSlot(null)
      }
    }
  }

  if (error) return <p className="text-center text-red-500 py-24">{error}</p>
  if (!showroom) return <Spinner />

  return (
    <div className="fade-in">
      <Link to="/showrooms" className="text-sm text-neutral-500 hover:text-neutral-900 mb-4 inline-block">
        <i className="fa-solid fa-arrow-left mr-1" />
        목록으로
      </Link>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <div className="h-56 lg:h-64 bg-neutral-100 rounded-2xl overflow-hidden mb-4">
            {showroom.image_url && (
              <img src={showroom.image_url} className="w-full h-full object-cover" alt={showroom.name} />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-1">{showroom.name}</h1>
          <p className="text-neutral-500 mb-3">
            <i className="fa-solid fa-location-dot mr-1" />
            {showroom.address}
          </p>
          <p className="text-neutral-600 leading-relaxed">{showroom.description}</p>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">방문 예약</h2>

            {/* Date selector */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {dates.length === 0 ? (
                <p className="text-neutral-400 text-sm">예약 가능한 날짜가 없습니다.</p>
              ) : (
                dates.map((d) => (
                  <button
                    key={d}
                    onClick={() => handleSelectDate(d)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition ${
                      d === selectedDate
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {formatDateLabel(d)}
                  </button>
                ))
              )}
            </div>

            {/* Slot selector */}
            {slotsForDate.length === 0 ? (
              <p className="text-neutral-400 text-sm py-6">선택하신 날짜에 예약 가능한 시간이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slotsForDate.map((s) => {
                  const isSelected = selectedSlot?.id === s.id
                  const base = 'px-3 py-2.5 rounded-xl text-sm font-medium border text-center transition'
                  if (!s.is_available) {
                    return (
                      <button key={s.id} disabled className={`${base} bg-neutral-100 text-neutral-300 border-neutral-100 cursor-not-allowed`}>
                        {s.start_time}
                      </button>
                    )
                  }
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSlot(s)}
                      className={`${base} ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white border-neutral-200 hover:border-amber-500'
                      }`}
                    >
                      {s.start_time}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Confirm panel */}
            {selectedSlot && (
              <div className="fade-in bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6">
                <p className="text-sm text-neutral-700 mb-3">
                  <span className="font-bold">
                    {formatDateLabel(selectedSlot.slot_date)} {selectedSlot.start_time} ~ {selectedSlot.end_time}
                  </span>{' '}
                  방문을 예약하시겠습니까?
                </p>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="요청사항 (선택)"
                  rows={2}
                  className="w-full text-sm border border-neutral-200 rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg font-medium bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition"
                  >
                    {submitting ? '예약 처리 중...' : '예약 확정'}
                  </button>
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="px-4 py-2.5 rounded-lg font-medium border border-neutral-200 bg-white hover:border-neutral-900 transition"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
