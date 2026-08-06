import { useState, type FormEvent } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { Showroom } from '../../lib/types'
import { useToast } from '../../context/ToastContext'

type Props = {
  showroom?: Showroom | null
  onSaved: () => void
  onCancel: () => void
}

export function ShowroomForm({ showroom, onSaved, onCancel }: Props) {
  const toast = useToast()
  const isEdit = !!showroom
  const [name, setName] = useState(showroom?.name || '')
  const [address, setAddress] = useState(showroom?.address || '')
  const [imageUrl, setImageUrl] = useState(showroom?.image_url || '')
  const [description, setDescription] = useState(showroom?.description || '')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = { name, address, description, image_url: imageUrl }
    try {
      if (isEdit) {
        await api.patch(`/admin/showrooms/${showroom.id}`, payload)
      } else {
        await api.post('/admin/showrooms', payload)
      }
      toast('저장되었습니다.', 'success')
      onSaved()
    } catch (e2) {
      toast(apiErrorMessage(e2, '저장에 실패했습니다.'), 'error')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="fade-in mt-4 bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          required
          placeholder="지점명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="주소"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <input
        placeholder="이미지 URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
      />
      <textarea
        placeholder="설명"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300 transition"
        >
          {isEdit ? '수정 완료' : '추가'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm border border-neutral-200 bg-white hover:border-neutral-900 transition"
        >
          취소
        </button>
      </div>
    </form>
  )
}
