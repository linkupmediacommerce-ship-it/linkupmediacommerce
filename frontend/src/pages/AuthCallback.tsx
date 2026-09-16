import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Spinner'

// Landing page for SNS login redirects (Kakao today; Naver/Google will reuse this
// same page later since the backend always redirects here with #/auth/callback?token=...).
// The token arrives in the URL fragment (HashRouter puts our own route params after
// the '#', so the token itself ends up as a second '?' inside the hash) rather than a
// real query string, so we read it via useSearchParams which HashRouter still parses
// correctly from the part after '#/auth/callback'.
export function AuthCallback() {
  const { loginWithToken } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const token = searchParams.get('token')
    if (!token) {
      toast('로그인에 실패했습니다.', 'error')
      navigate('/login', { replace: true })
      return
    }

    loginWithToken(token)
      .then((user) => {
        toast(`${user.name}님, 환영합니다!`, 'success')
        const isAdmin = user.role === 'super_admin' || user.role === 'brand_admin'
        if (!isAdmin && !user.phone) {
          // SNS accounts (Kakao especially) often arrive without a phone number,
          // which we need as the actual reservation contact method.
          navigate('/complete-profile', { replace: true })
        } else {
          navigate(isAdmin ? '/admin' : '/showrooms', { replace: true })
        }
      })
      .catch(() => {
        toast('로그인 처리 중 오류가 발생했습니다.', 'error')
        navigate('/login', { replace: true })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="py-24">
      <Spinner />
      <p className="text-center text-neutral-400 text-sm mt-4">로그인 처리 중입니다...</p>
    </div>
  )
}
