// Kakao Login (OAuth 2.0) helpers.
// Docs: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
//
// Cloudflare Workers has no Node SDK support, so we call Kakao's REST endpoints
// directly with fetch. The whole exchange (code -> token -> profile) happens
// server-side in the callback route; the browser only ever sees our own JWT.

const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize'
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token'
const KAKAO_USER_INFO_URL = 'https://kapi.kakao.com/v2/user/me'

export type KakaoProfile = {
  id: number // Kakao's unique member id -> stored as provider_user_id (as string)
  email: string | null // present only if the user granted the (optional) email consent
  nickname: string | null
}

export function buildKakaoAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state
  })
  return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`
}

export async function exchangeKakaoCode(
  clientId: string,
  clientSecret: string | undefined,
  redirectUri: string,
  code: string
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code
  })
  if (clientSecret) {
    params.set('client_secret', clientSecret)
  }

  const res = await fetch(KAKAO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: params.toString()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`카카오 토큰 발급 실패: ${res.status} ${text}`)
  }
  const data = await res.json<{ access_token: string }>()
  return data.access_token
}

export async function fetchKakaoProfile(accessToken: string): Promise<KakaoProfile> {
  const res = await fetch(KAKAO_USER_INFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`카카오 사용자 정보 조회 실패: ${res.status} ${text}`)
  }
  const data = await res.json<{
    id: number
    kakao_account?: {
      email?: string
      has_email?: boolean
      profile?: { nickname?: string }
    }
    properties?: { nickname?: string }
  }>()

  return {
    id: data.id,
    email: data.kakao_account?.email ?? null,
    nickname: data.kakao_account?.profile?.nickname ?? data.properties?.nickname ?? null
  }
}

export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
