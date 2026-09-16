import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage } from '../lib/api'

export function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')
  const oauthError = searchParams.get('error')
  const shownError = useRef(false)

  useEffect(() => {
    if (oauthError && !shownError.current) {
      shownError.current = true
      toast(oauthError, 'error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthError])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const user = await login(email, password)
      toast(`${user.name}님, 환영합니다!`, 'success')
      const isAdmin = user.role === 'super_admin' || user.role === 'brand_admin'
      navigate(next || (isAdmin ? '/admin' : '/showrooms'))
    } catch (err) {
      toast(apiErrorMessage(err, '로그인에 실패했습니다.'), 'error')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto fade-in">
      <h1 className="text-2xl font-bold mb-6 text-center">로그인</h1>
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">이메일</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">비밀번호</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg font-medium bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300 transition"
        >
          로그인
        </button>
        <p className="text-center text-sm text-neutral-500">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-amber-600 font-medium hover:underline">
            회원가입
          </Link>
        </p>

        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 border-t border-neutral-100" />
          <span className="text-xs text-neutral-400">또는</span>
          <div className="flex-1 border-t border-neutral-100" />
        </div>

        <a
          href="/api/auth/kakao/login"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-medium bg-[#FEE500] text-[#191919] hover:brightness-95 transition"
        >
          <i className="fa-solid fa-comment" />
          카카오로 로그인
        </a>

        <p className="text-center text-xs text-neutral-400 pt-2 border-t border-neutral-100">
          테스트 계정: user@brooks.com / user1234
          <br />
          최고관리자: admin@all4run.co.kr / admin1234
          <br />
          브랜드관리자(BROOKS): brooks@all4run.co.kr / brooks1234
        </p>
      </form>
    </div>
  )
}
