import { useCallback, useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { Showroom } from '../../lib/types'
import { Spinner } from '../../components/Spinner'
import { Badge } from '../../components/Badge'
import { useToast } from '../../context/ToastContext'
import { ShowroomForm } from './ShowroomForm'
import { SlotManager } from './SlotManager'

export function AdminShowrooms() {
  const toast = useToast()
  const [showrooms, setShowrooms] = useState<Showroom[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedSlotsId, setExpandedSlotsId] = useState<number | null>(null)

  const load = useCallback(() => {
    api
      .get('/admin/showrooms')
      .then((res) => setShowrooms(res.data.showrooms))
      .catch((e) => setError(apiErrorMessage(e, '쇼룸 정보를 불러오지 못했습니다.')))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleToggleActive(s: Showroom) {
    try {
      await api.patch(`/admin/showrooms/${s.id}`, { is_active: !s.is_active })
      toast('업데이트 되었습니다.', 'success')
      load()
    } catch (e) {
      toast(apiErrorMessage(e, '처리에 실패했습니다.'), 'error')
    }
  }

  async function handleDelete(s: Showroom) {
    if (!confirm(`'${s.name}' 쇼룸을 완전히 삭제하시겠습니까?\n예약이 있는 경우 삭제할 수 없습니다.`)) return
    try {
      await api.delete(`/admin/showrooms/${s.id}`)
      toast('쇼룸이 삭제되었습니다.', 'success')
      load()
    } catch (e) {
      toast(apiErrorMessage(e, '삭제에 실패했습니다.'), 'error')
    }
  }

  if (error) return <p className="text-center text-red-500 py-16">{error}</p>
  if (!showrooms) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="px-4 py-2 rounded-lg text-sm bg-neutral-900 text-white hover:bg-neutral-700 transition"
        >
          <i className="fa-solid fa-plus mr-1" />
          새 쇼룸 추가
        </button>
      </div>

      {showNewForm && (
        <ShowroomForm
          onSaved={() => {
            setShowNewForm(false)
            load()
          }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      <div className="space-y-4 mt-4">
        {showrooms.map((s) => (
          <div key={s.id} className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{s.name}</h3>
                  {!s.is_active && <Badge variant="cancelled">비활성</Badge>}
                </div>
                <p className="text-sm text-neutral-500">
                  <i className="fa-solid fa-location-dot mr-1" />
                  {s.address}
                </p>
                <p className="text-sm text-neutral-400 mt-1">{s.description}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 bg-white hover:border-neutral-900 transition"
                >
                  수정
                </button>
                <button
                  onClick={() => setExpandedSlotsId(expandedSlotsId === s.id ? null : s.id)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 bg-white hover:border-neutral-900 transition"
                >
                  시간대 관리
                </button>
                <button
                  onClick={() => handleToggleActive(s)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 bg-white hover:border-neutral-900 transition"
                >
                  {s.is_active ? '비활성화' : '활성화'}
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50 transition"
                >
                  삭제
                </button>
              </div>
            </div>

            {editingId === s.id && (
              <ShowroomForm
                showroom={s}
                onSaved={() => {
                  setEditingId(null)
                  load()
                }}
                onCancel={() => setEditingId(null)}
              />
            )}

            {expandedSlotsId === s.id && (
              <div className="mt-4">
                <SlotManager showroomId={s.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
