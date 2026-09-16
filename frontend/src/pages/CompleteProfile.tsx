import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, apiErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// Shown once, right after a first-time SNS login, when the account has no phone
// number yet (Kakao in particular doesn't provide one at all). We need a real
// contact number since it's what showroom staff use to reach the reservation holder.
export function CompleteProfile() {
  const { refreshUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.patch('/auth/profile', { phone })
      await refreshUser()
      toast('연락처가 등록되었습니다.', 'success')
      navigate('/showrooms', { replace: true })
    } catch (err) {
      toast(apiErrorMessage(err, '저장에 실패했습니다.'), 'error')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto fade-in">
      <h1 className="text-2xl font-bold mb-2 text-center">연락처를 입력해주세요</h1>
      <p className="text-neutral-500 text-sm text-center mb-6">
        예약 확인을 위해 연락 가능한 전화번호가 필요합니다.
      </p>
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">연락처</label>
          <input
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg font-medium bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300 transition"
        >
          완료
        </button>
      </form>
    </div>
  )
}
