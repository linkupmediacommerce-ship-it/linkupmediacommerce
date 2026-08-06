# 브룩스 쇼룸 예약 시스템 (Brooks Showroom Reservation)

## 프로젝트 개요
- **이름**: 브룩스(BROOKS) 쇼룸 예약 시스템
- **목표**: 회원제 쇼룸 방문 예약 서비스 - 사용자는 지점을 선택하고 원하는 날짜/시간에 방문을 예약, 관리자는 백오피스에서 예약/회원/쇼룸을 관리
- **단계**: MVP (Minimum Viable Product)

## 주요 기능

### 일반 사용자
- ✅ 회원가입 / 로그인 (JWT 기반 인증, 7일 유효)
- ✅ 쇼룸 지점 목록 조회 (상수점, 올림픽공원점, 한남점)
- ✅ 쇼룸 상세 페이지 (예약 가능한 날짜/시간대 조회)
- ✅ 날짜/시간 선택 후 즉시 예약 (회원만 가능)
- ✅ 내 예약 목록 조회 및 예약 취소

### 관리자 (백오피스)
- ✅ 전체 예약 목록 조회 (지점/상태/날짜 필터링)
- ✅ 예약 상태 변경 (취소/복원), 예약 삭제
- ✅ 회원 목록 및 예약 이력 조회
- ✅ 쇼룸 지점 추가/수정/비활성화
- ✅ 쇼룸별 예약 가능 시간대 추가/삭제

## URLs
- **로컬 개발**: http://localhost:3000
- **샌드박스 미리보기**: https://3000-i5n6jiaclyuu4d8p18uv1-5185f4aa.sandbox.novita.ai
- **프로덕션**: (배포 후 업데이트 예정)

### 테스트 계정
| 구분 | 이메일 | 비밀번호 |
|---|---|---|
| 일반회원 | user@brooks.com | user1234 |
| 관리자 | admin@brooks.com | admin1234 |

## API 엔드포인트

### 인증
| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/auth/signup` | 회원가입 (email, password, name, phone) | - |
| POST | `/api/auth/login` | 로그인 (email, password) | - |
| POST | `/api/auth/logout` | 로그아웃 | - |
| GET | `/api/auth/me` | 내 정보 조회 | 필요 |

### 쇼룸
| Method | Path | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/showrooms` | 쇼룸 목록 조회 | - |
| GET | `/api/showrooms/:id` | 쇼룸 상세 조회 | - |
| GET | `/api/showrooms/:id/slots?date=YYYY-MM-DD` | 예약 가능 시간대 조회 | - |

### 예약 (회원 전용)
| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/reservations` | 예약 생성 (time_slot_id, memo) | 필요 |
| GET | `/api/reservations/my` | 내 예약 목록 | 필요 |
| DELETE | `/api/reservations/:id` | 내 예약 취소 | 필요 |

### 관리자
| Method | Path | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/admin/reservations?showroom_id=&status=&date=` | 전체 예약 조회 | 관리자 |
| PATCH | `/api/admin/reservations/:id` | 예약 수정 (status/memo/time_slot_id) | 관리자 |
| DELETE | `/api/admin/reservations/:id` | 예약 완전 삭제 | 관리자 |
| GET | `/api/admin/users` | 전체 회원 목록 | 관리자 |
| GET | `/api/admin/users/:id` | 회원 상세 + 예약 이력 | 관리자 |
| GET | `/api/admin/showrooms` | 전체 쇼룸 목록(비활성 포함) | 관리자 |
| POST | `/api/admin/showrooms` | 쇼룸 추가 | 관리자 |
| PATCH | `/api/admin/showrooms/:id` | 쇼룸 수정/비활성화 | 관리자 |
| GET | `/api/admin/showrooms/:id/slots` | 쇼룸 시간대 조회(관리자용) | 관리자 |
| POST | `/api/admin/showrooms/:id/slots` | 시간대 추가 | 관리자 |
| DELETE | `/api/admin/slots/:id` | 시간대 삭제 | 관리자 |

## 데이터 아키텍처

### 데이터 모델
- **users**: 회원 정보 (id, email, password_hash, name, phone, is_admin)
- **showrooms**: 쇼룸 지점 (id, name, address, description, image_url, is_active)
- **time_slots**: 쇼룸별 예약 가능 시간대 (id, showroom_id, slot_date, start_time, end_time, is_active)
- **reservations**: 예약 (id, user_id, showroom_id, time_slot_id, status, memo)
  - `time_slot_id`에 대해 `status='confirmed'`인 예약은 유니크 제약으로 중복 예약 방지

### 저장소
- **Cloudflare D1** (SQLite 기반): 모든 데이터 저장
- 로컬 개발 시 `.wrangler/state/v3/d1`에 로컬 SQLite로 자동 매핑

### 인증 방식
- 비밀번호: PBKDF2 (100,000회 반복, SHA-256) 솔트 해싱 (신규 가입자)
  - 시드 데이터는 `sha256:<hex>` 레거시 포맷 사용 (호환 지원)
- 토큰: JWT (HS256), localStorage 저장 + Authorization 헤더 전달, httpOnly 쿠키도 병행 설정

## 사용자 가이드
1. **회원가입/로그인**: 상단 네비게이션에서 회원가입 또는 로그인
2. **쇼룸 둘러보기**: 메인 화면에서 원하는 지점 카드를 클릭
3. **예약하기**: 상세 페이지에서 날짜 → 시간 선택 → 예약 확정 버튼 클릭 (로그인 필요)
4. **내 예약 확인**: 상단 "내 예약" 메뉴에서 예약 내역 확인 및 취소 가능
5. **관리자**: 관리자 계정으로 로그인 시 상단에 "관리자" 메뉴가 노출되며, 예약/회원/쇼룸 관리 가능

## 기술 스택
- **백엔드**: Hono (TypeScript) on Cloudflare Workers
- **프론트엔드**: Vanilla JS SPA (hash 라우팅) + TailwindCSS(CDN) + Axios + Day.js
- **데이터베이스**: Cloudflare D1 (SQLite)
- **인증**: JWT (hono/jwt), PBKDF2 비밀번호 해싱 (Web Crypto API)
- **배포**: Cloudflare Pages

## 아직 구현되지 않은 기능 (향후 개선사항)
- [ ] 이메일 인증/비밀번호 재설정
- [ ] 예약 알림 (이메일/SMS)
- [ ] 관리자 대시보드 통계 (예약 추이, 지점별 통계 등)
- [ ] 반복 시간대 대량 생성 UI (현재는 1건씩 추가)
- [ ] 이미지 업로드 (현재는 URL 입력 방식)
- [ ] 회원 정보 수정 기능
- [ ] 예약 변경(날짜/시간 변경) - 관리자 API는 지원하나 사용자 UI 미구현
- [ ] 페이지네이션 (회원/예약 목록이 많아질 경우)

## 다음 개발 단계 추천
1. 관리자 페이지에 통계 대시보드 추가
2. 사용자가 직접 예약 시간 변경 가능하도록 UI 추가
3. 이메일 알림 연동 (Resend/SendGrid API)
4. 반복 시간대 생성 기능 (예: 매주 특정 요일/시간 자동 등록)
5. 프로덕션 배포 및 커스텀 도메인 연결

## 배포 상태
- **플랫폼**: Cloudflare Pages
- **상태**: 🟡 로컬 개발 완료, 프로덕션 배포 대기
- **마지막 업데이트**: 2026-08-06
