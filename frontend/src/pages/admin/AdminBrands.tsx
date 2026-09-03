import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { Brand } from '../../lib/types'
import { Spinner } from '../../components/Spinner'
import { Badge } from '../../components/Badge'
import { useToast } from '../../context/ToastContext'

export function AdminBrands() {
  const toast = useToast()
  const [brands, setBrands] = useState<Brand[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    api
      .get('/admin/brands')
      .then((res) => setBrands(res.data.brands))
      .catch((e) => setError(apiErrorMessage(e, '브랜드 정보를 불러오지 못했습니다.')))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function resetForm() {
    setSlug('')
    setName('')
    setDescription('')
    setAdminEmail('')
    setAdminPassword('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/admin/brands', {
        slug,
        name,
        description,
        admin_email: adminEmail || undefined,
        admin_password: adminPassword || undefined
      })
      toast('브랜드가 생성되었습니다.', 'success')
      resetForm()
      setShowForm(false)
      load()
    } catch (err) {
      toast(apiErrorMessage(err, '브랜드 생성에 실패했습니다.'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive(b: Brand) {
    try {
      await api.patch(`/admin/brands/${b.id}`, { is_active: !b.is_active })
      toast('업데이트 되었습니다.', 'success')
      load()
    } catch (err) {
      toast(apiErrorMessage(err, '처리에 실패했습니다.'), 'error')
    }
  }

  if (error) return <p className="text-center text-red-500 py-16">{error}</p>
  if (!brands) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-lg text-sm bg-neutral-900 text-white hover:bg-neutral-700 transition"
        >
          <i className="fa-solid fa-plus mr-1" />
          새 브랜드 추가
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="fade-in mb-6 bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              required
              placeholder="슬러그 (예: brooks)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="브랜드명 (예: BROOKS)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="브랜드 설명 (선택)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-neutral-400 pt-1">브랜드관리자 계정을 함께 발급하려면 아래를 입력하세요 (선택).</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="브랜드관리자 이메일 (예: brooks@all4run.co.kr)"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="브랜드관리자 임시 비밀번호"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300 transition"
            >
              생성
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="px-4 py-2 rounded-lg text-sm border border-neutral-200 bg-white hover:border-neutral-900 transition"
            >
              취소
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto bg-white border border-neutral-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-left">
            <tr>
              <th className="px-4 py-3">슬러그</th>
              <th className="px-4 py-3">브랜드명</th>
              <th className="px-4 py-3">설명</th>
              <th className="px-4 py-3">쇼룸수</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {brands.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-neutral-400 py-12">
                  등록된 브랜드가 없습니다.
                </td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-mono text-neutral-500">{b.slug}</td>
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-neutral-500 max-w-[260px] whitespace-pre-wrap break-words">
                    {b.description || '-'}
                  </td>
                  <td className="px-4 py-3">{b.showroom_count ?? 0}</td>
                  <td className="px-4 py-3">
                    {b.is_active ? <Badge variant="confirmed">활성</Badge> : <Badge variant="cancelled">비활성</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(b)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100"
                    >
                      {b.is_active ? '비활성화' : '활성화'}
                    </button>
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
