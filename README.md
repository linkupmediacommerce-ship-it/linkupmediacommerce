# all4run - 멀티브랜드 쇼룸 예약 플랫폼

## 프로젝트 개요
- **이름**: all4run (구 브룩스 쇼룸 예약 시스템에서 멀티브랜드 플랫폼으로 확장)
- **목표**: 여러 브랜드가 각자의 쇼룸/이벤트를 등록하고 자기 브랜드의 예약만 관리할 수 있는 멀티테넌트 예약 플랫폼. 최고관리자는 브랜드 온보딩(생성 + 브랜드관리자 계정 발급)을 담당.
- **단계**: MVP (1차 구현, 추후 개선 예정)

## 주요 기능

### 일반 사용자
- ✅ 회원가입 / 로그인 (JWT 기반 인증, 7일 유효)
- ✅ 쇼룸 목록 조회 — **모든 브랜드가 섞인 단일 피드** (브랜드명 뱃지로 구분 표시)
- ✅ 쇼룸 상세 페이지 (예약 가능한 날짜/시간대 조회, 시간대별 인원수/잔여 표시)
- ✅ 날짜/시간 선택 후 즉시 예약 (회원만 가능), 정원 초과 시 원자적 차단
- ✅ 내 예약 목록 조회 및 예약 취소

### 브랜드관리자 (`{brand}@all4run.co.kr`)
- ✅ 자기 브랜드로 자동 스코핑된 예약/쇼룸/시간대 관리 (다른 브랜드 데이터 접근 시 403)
- ✅ 쇼룸 추가/수정/비활성화/삭제, 시간대 및 인원수(capacity) 관리
- ❌ 회원 전체 목록, 브랜드 관리 화면은 접근 불가 (최고관리자 전용)

### 최고관리자 (`admin@all4run.co.kr`)
- ✅ 전체 브랜드/쇼룸/예약/회원 조회 및 관리 (스코핑 없음)
- ✅ **브랜드 관리**: 브랜드 생성 + 브랜드관리자 계정 동시 발급 (`/admin/brands`)
- ✅ 전체 회원 목록 조회 (`/admin/users`, role/brand_id 표시)

## URLs
- **로컬 개발**: http://localhost:3000
- **프로덕션 (Cloudflare Pages)**: https://brooks-showroom.pages.dev
- **GitHub**: https://github.com/linkupmediacommerce-ship-it/linkupmediacommerce

### 테스트 계정
| 구분 | 이메일 | 비밀번호 | role | brand_id |
|---|---|---|---|---|
| 일반회원 | user@brooks.com | user1234 | user | - |
| 최고관리자 | admin@all4run.co.kr | admin1234 | super_admin | null |
| 브랜드관리자(BROOKS) | brooks@all4run.co.kr | brooks1234 | brand_admin | 1 |
| (레거시, 하위호환) | admin@brooks.com | admin1234 | super_admin (마이그레이션됨) | null |

## API 엔드포인트

### 인증
| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/auth/signup` | 회원가입 (email, password, name, phone) → role='user' | - |
| POST | `/api/auth/login` | 로그인 → JWT payload에 role/brand_id 포함 | - |
| POST | `/api/auth/logout` | 로그아웃 | - |
| GET | `/api/auth/me` | 내 정보 조회 (role/brand_id 포함) | 필요 |

### 쇼룸 (공개, 전체 브랜드 mixed feed)
| Method | Path | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/showrooms` | 쇼룸 목록 (brand_name/brand_slug 포함) | - |
| GET | `/api/showrooms/:id` | 쇼룸 상세 | - |
| GET | `/api/showrooms/:id/slots?date=YYYY-MM-DD` | 예약 가능 시간대 (capacity/remaining/is_available) | - |

### 예약 (회원 전용)
| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/reservations` | 예약 생성 (원자적 정원 체크) | 필요 |
| GET | `/api/reservations/my` | 내 예약 목록 | 필요 |
| DELETE | `/api/reservations/:id` | 내 예약 취소 | 필요 |

### 관리자 (super_admin + brand_admin, brand_admin은 자기 브랜드로 자동 스코핑)
| Method | Path | 설명 | 권한 |
|---|---|---|---|
| GET | `/api/admin/reservations?showroom_id=&status=&date=` | 예약 조회 | admin (brand-scoped) |
| PATCH/DELETE | `/api/admin/reservations/:id` | 예약 수정/삭제 | admin (brand-scoped) |
| GET/POST/PATCH/DELETE | `/api/admin/showrooms[/:id]` | 쇼룸 CRUD | admin (brand-scoped, super_admin은 brand_id 지정 필요) |
| GET/POST | `/api/admin/showrooms/:id/slots` | 시간대 조회/추가 | admin (brand-scoped) |
| PATCH/DELETE | `/api/admin/slots/:id` | 시간대 인원수 수정/삭제 | admin (brand-scoped) |

### 관리자 (super_admin 전용)
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/admin/users` / `/api/admin/users/:id` | 전체 회원 조회 |
| GET | `/api/admin/brands` | 전체 브랜드 목록 |
| POST | `/api/admin/brands` | 브랜드 생성 (+선택적으로 admin_email/admin_password로 브랜드관리자 동시 발급) |
| PATCH | `/api/admin/brands/:id` | 브랜드 수정/비활성화 |

## 데이터 아키텍처

### 데이터 모델
- **brands**: 브랜드/테넌트 (id, slug, name, description, logo_url, is_active)
- **users**: 회원 정보 (id, email, password_hash, name, phone, is_admin(레거시), **role**, **brand_id**)
  - `role`: `'user'` | `'brand_admin'`(brand_id로 스코핑) | `'super_admin'`(플랫폼 전체)
- **showrooms**: 쇼룸/포스팅 (id, **brand_id**, name, address, description, image_url, is_active)
- **time_slots**: 쇼룸별 예약 가능 시간대 (id, showroom_id, slot_date, start_time, capacity, is_active)
- **reservations**: 예약 (id, user_id, showroom_id, time_slot_id, status, memo)
  - `(time_slot_id, user_id)`에 대해 `status='confirmed'`인 예약은 유니크 제약 (사용자당 중복 예약 방지)
  - 시간대 `capacity`를 초과하지 않도록 INSERT 시점에 원자적 카운트 체크

### 저장소
- **Cloudflare D1** (SQLite 기반): 모든 데이터 저장
- 로컬 개발 시 `.wrangler/state/v3/d1`에 로컬 SQLite로 자동 매핑
- 마이그레이션: `migrations/0001`~`0004` (`0004_multi_brand.sql`이 브랜드/역할 스코핑 추가)

### 인증 방식
- 비밀번호: PBKDF2 (100,000회 반복, SHA-256) 솔트 해싱 (신규 가입자)
  - 시드 데이터는 `sha256:<hex>` 레거시 포맷 사용 (호환 지원)
- 토큰: JWT (HS256), payload에 `sub/email/name/is_admin/role/brand_id/exp` 포함
  - localStorage 저장 + Authorization 헤더 전달, httpOnly 쿠키도 병행 설정

## 사용자 가이드
1. **회원가입/로그인**: 상단 네비게이션에서 회원가입 또는 로그인
2. **쇼룸 둘러보기**: 메인 화면에서 브랜드명 뱃지가 표시된 카드 중 원하는 지점 클릭
3. **예약하기**: 상세 페이지에서 날짜 → 시간 선택 → 예약 확정 (로그인 필요, 정원 마감 시 버튼 비활성화)
4. **내 예약 확인**: 상단 "내 예약" 메뉴
5. **브랜드관리자**: 발급받은 `{brand}@all4run.co.kr` 계정으로 로그인 → "관리자" 메뉴에서 자기 브랜드 쇼룸/시간대/예약만 관리
6. **최고관리자**: `admin@all4run.co.kr`로 로그인 → "브랜드 관리" 탭에서 신규 브랜드 생성 + 브랜드관리자 계정 발급, "회원 관리"에서 전체 회원 조회

## 기술 스택
- **백엔드**: Hono (TypeScript) on Cloudflare Workers
- **프론트엔드**: React 19 + Vite + TypeScript (react-router-dom HashRouter) + TailwindCSS(CDN) + Axios + Day.js
  - CSS는 `frontend/src/css/` 폴더로 구조화 (base/animations/utilities/components/pages + index 애그리게이터)
- **데이터베이스**: Cloudflare D1 (SQLite)
- **인증**: JWT (hono/jwt), PBKDF2 비밀번호 해싱 (Web Crypto API), role/brand_id 기반 2단계 관리자 권한
- **배포**: Cloudflare Pages

## 아직 구현되지 않은 기능 (향후 개선사항)
- [ ] 브랜드관리자 계정 발급 시 이메일 자동 발송 (현재는 화면에서 수동 전달)
- [ ] 브랜드별 로고 업로드 및 노출 UI (logo_url 컬럼은 이미 존재)
- [ ] 브랜드별 피드 분리 옵션 (현재는 전체 mixed feed만 지원, 요구사항상 1차 범위 제외)
- [ ] 브랜드관리자 비밀번호 변경/재설정 기능
- [ ] 이메일 인증/비밀번호 재설정 (일반 회원)
- [ ] 예약 알림 (이메일/SMS)
- [ ] 관리자 대시보드 통계 (브랜드별/지점별 통계 등)
- [ ] 반복 시간대 대량 생성 UI (현재는 1건씩 추가)
- [ ] 이미지 업로드 (현재는 URL 입력 방식)
- [ ] 페이지네이션 (회원/예약/브랜드 목록이 많아질 경우)

## 다음 개발 단계 추천
1. 브랜드 관리 화면에서 로고 업로드 + 브랜드별 커스텀 컬러 지원
2. 브랜드관리자 셀프서비스 비밀번호 변경 기능
3. 브랜드별 피드 필터(탭) 옵션 추가 (필요 시)
4. 이메일 알림 연동 (Resend/SendGrid API) — 브랜드 온보딩 시 계정 정보 자동 발송 포함
5. 관리자 대시보드에 브랜드별 예약 통계 추가

## 배포 상태
- **플랫폼**: Cloudflare Pages (Workers Functions + D1)
- **상태**: 🟢 프로덕션 배포 완료 — https://brooks-showroom.pages.dev
- **DB**: Cloudflare D1 `brooks-showroom-production` (프로덕션 계정, `0001`~`0004` 마이그레이션 + 멀티브랜드 seed 계정 적용 완료)
- **마지막 업데이트**: 2026-09-03 (멀티브랜드/all4run 플랫폼 MVP)

### 재배포 방법 (본인 Cloudflare 계정)
```bash
npm run build
npx wrangler pages deploy dist --project-name brooks-showroom
```

### 신규 마이그레이션 적용 방법
```bash
npx wrangler d1 migrations apply brooks-showroom-production --local   # 로컬
npx wrangler d1 migrations apply brooks-showroom-production --remote  # 프로덕션
```

## 개발/빌드 방법 (모노레포 구조)
```bash
# 1. 프론트엔드 빌드 (frontend/ → 루트 public/ 으로 출력)
cd frontend && npm run build

# 2. Hono 백엔드(Worker) 빌드 (루트, public/ 을 dist/ 로 번들)
cd .. && npm run build

# 3. PM2로 실행
pm2 restart webapp   # 또는 pm2 start ecosystem.config.cjs
```
> 주의: `frontend/vite.config.ts`의 `emptyOutDir: true`로 인해 frontend 빌드 시 루트 `public/`이 완전히 덮어써집니다. `_routes.json`은 `frontend/public/_routes.json`에 위치해 있어 frontend 빌드마다 자동으로 함께 복사됩니다.
