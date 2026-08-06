// ==================== Brooks Showroom Reservation - SPA ====================

axios.defaults.baseURL = '/api'

let currentUser = null

function getToken() { return localStorage.getItem('brooks_token') }
function setToken(t) { localStorage.setItem('brooks_token', t) }
function clearToken() { localStorage.removeItem('brooks_token') }

axios.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toast(message, type = 'info') {
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div')
    el.id = 'toast-container'
    el.className = 'fixed top-20 right-4 z-50 flex flex-col gap-2 items-end'
    document.body.appendChild(el)
    return el
  })()
  const colors = {
    info: 'bg-neutral-900',
    success: 'bg-green-600',
    error: 'bg-red-600'
  }
  const toastEl = document.createElement('div')
  toastEl.className = `fade-in text-white text-sm px-4 py-3 rounded-lg shadow-lg ${colors[type] || colors.info}`
  toastEl.textContent = message
  container.appendChild(toastEl)
  setTimeout(() => toastEl.remove(), 3000)
}

function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error || fallback || '오류가 발생했습니다.'
}

function navigate(hash) {
  window.location.hash = hash
}

// ==================== Auth ====================

async function loadCurrentUser() {
  const token = getToken()
  if (!token) { currentUser = null; return }
  try {
    const res = await axios.get('/auth/me')
    currentUser = res.data.user
  } catch (e) {
    clearToken()
    currentUser = null
  }
}

function requireLogin(redirectHash) {
  if (!currentUser) {
    toast('로그인이 필요합니다.', 'error')
    navigate(`#/login?next=${encodeURIComponent(redirectHash || window.location.hash)}`)
    return false
  }
  return true
}

function requireAdmin() {
  if (!currentUser || !currentUser.is_admin) {
    toast('관리자만 접근할 수 있습니다.', 'error')
    navigate('#/showrooms')
    return false
  }
  return true
}

// ==================== Nav ====================

function renderNav() {
  const nav = document.getElementById('nav-links')
  if (!nav) return

  let html = `<a href="#/showrooms" class="px-3 py-2 rounded-lg hover:bg-neutral-100 transition">쇼룸 목록</a>`

  if (currentUser) {
    html += `<a href="#/my" class="px-3 py-2 rounded-lg hover:bg-neutral-100 transition">내 예약</a>`
    if (currentUser.is_admin) {
      html += `<a href="#/admin" class="px-3 py-2 rounded-lg hover:bg-neutral-100 transition text-amber-700">관리자</a>`
    }
    html += `
      <span class="text-neutral-400 mx-1">|</span>
      <span class="text-neutral-600 hidden sm:inline">${escapeHtml(currentUser.name)}님</span>
      <button id="logout-btn" class="px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition">로그아웃</button>
    `
  } else {
    html += `
      <a href="#/login" class="px-3 py-2 rounded-lg hover:bg-neutral-100 transition">로그인</a>
      <a href="#/signup" class="px-3 py-2 rounded-lg btn-primary text-white transition">회원가입</a>
    `
  }
  nav.innerHTML = html

  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await axios.post('/auth/logout') } catch (e) {}
      clearToken()
      currentUser = null
      renderNav()
      toast('로그아웃 되었습니다.')
      navigate('#/showrooms')
    })
  }
}

// ==================== Router ====================

const appRoot = () => document.getElementById('app-root')

function parseHash() {
  const hash = window.location.hash || '#/showrooms'
  const withoutHash = hash.slice(1) // remove '#'
  const [pathPart, queryPart] = withoutHash.split('?')
  const parts = pathPart.split('/').filter(Boolean)
  const query = {}
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [k, v] = pair.split('=')
      query[decodeURIComponent(k)] = decodeURIComponent(v || '')
    }
  }
  return { parts, query }
}

async function router() {
  const { parts, query } = parseHash()
  window.scrollTo(0, 0)

  if (parts.length === 0 || parts[0] === 'showrooms') {
    if (parts.length === 2) {
      return renderShowroomDetail(parts[1])
    }
    return renderShowroomList()
  }
  if (parts[0] === 'login') return renderLogin(query.next)
  if (parts[0] === 'signup') return renderSignup(query.next)
  if (parts[0] === 'my') return renderMyReservations()
  if (parts[0] === 'admin') return renderAdmin(query.tab || 'reservations')

  return renderNotFound()
}

function renderNotFound() {
  appRoot().innerHTML = `
    <div class="text-center py-24">
      <p class="text-2xl font-bold mb-2">페이지를 찾을 수 없습니다</p>
      <a href="#/showrooms" class="text-amber-600 hover:underline">쇼룸 목록으로 이동</a>
    </div>
  `
}

function loadingHtml() {
  return `<div class="flex justify-center py-24"><div class="spinner"></div></div>`
}

// ==================== Pages: Showroom List ====================

async function renderShowroomList() {
  appRoot().innerHTML = loadingHtml()
  try {
    const res = await axios.get('/showrooms')
    const showrooms = res.data.showrooms

    appRoot().innerHTML = `
      <div class="fade-in">
        <div class="mb-8">
          <h1 class="text-3xl font-bold mb-2">쇼룸 예약</h1>
          <p class="text-neutral-500">방문하실 브룩스 쇼룸 지점을 선택해주세요.</p>
        </div>
        <div id="showroom-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
      </div>
    `

    const grid = document.getElementById('showroom-grid')
    if (showrooms.length === 0) {
      grid.innerHTML = `<p class="text-neutral-400 col-span-full text-center py-16">등록된 쇼룸이 없습니다.</p>`
      return
    }

    grid.innerHTML = showrooms.map((s) => `
      <a href="#/showrooms/${s.id}" class="card-hover block bg-white rounded-2xl overflow-hidden border border-neutral-200">
        <div class="h-44 bg-neutral-100 overflow-hidden">
          ${s.image_url ? `<img src="${escapeHtml(s.image_url)}" class="w-full h-full object-cover" alt="${escapeHtml(s.name)}" />` : `<div class="w-full h-full flex items-center justify-center text-neutral-300"><i class="fa-solid fa-image text-3xl"></i></div>`}
        </div>
        <div class="p-5">
          <h3 class="text-lg font-bold mb-1">${escapeHtml(s.name)}</h3>
          <p class="text-sm text-neutral-500 mb-2"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(s.address)}</p>
          <p class="text-sm text-neutral-400 line-clamp-2">${escapeHtml(s.description || '')}</p>
        </div>
      </a>
    `).join('')
  } catch (e) {
    appRoot().innerHTML = `<p class="text-center text-red-500 py-24">${escapeHtml(apiErrorMessage(e, '쇼룸 목록을 불러오지 못했습니다.'))}</p>`
  }
}

// ==================== Pages: Showroom Detail + Reservation ====================

let detailState = { showroomId: null, slots: [], selectedDate: null, selectedSlot: null }

async function renderShowroomDetail(id) {
  appRoot().innerHTML = loadingHtml()
  try {
    const [showroomRes, slotsRes] = await Promise.all([
      axios.get(`/showrooms/${id}`),
      axios.get(`/showrooms/${id}/slots`)
    ])
    const showroom = showroomRes.data.showroom
    const slots = slotsRes.data.slots

    detailState = { showroomId: id, slots, selectedDate: null, selectedSlot: null }

    const dates = [...new Set(slots.map((s) => s.slot_date))].sort()
    detailState.selectedDate = dates[0] || null

    appRoot().innerHTML = `
      <div class="fade-in">
        <a href="#/showrooms" class="text-sm text-neutral-500 hover:text-neutral-900 mb-4 inline-block"><i class="fa-solid fa-arrow-left mr-1"></i>목록으로</a>
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div class="lg:col-span-2">
            <div class="h-56 lg:h-64 bg-neutral-100 rounded-2xl overflow-hidden mb-4">
              ${showroom.image_url ? `<img src="${escapeHtml(showroom.image_url)}" class="w-full h-full object-cover" alt="${escapeHtml(showroom.name)}" />` : ''}
            </div>
            <h1 class="text-2xl font-bold mb-1">${escapeHtml(showroom.name)}</h1>
            <p class="text-neutral-500 mb-3"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(showroom.address)}</p>
            <p class="text-neutral-600 leading-relaxed">${escapeHtml(showroom.description || '')}</p>
          </div>
          <div class="lg:col-span-3">
            <div class="bg-white border border-neutral-200 rounded-2xl p-6">
              <h2 class="text-lg font-bold mb-4">방문 예약</h2>
              <div id="date-selector" class="flex gap-2 mb-6 overflow-x-auto pb-2"></div>
              <div id="slot-selector"></div>
              <div id="reservation-confirm-panel" class="mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    `

    renderDateSelector(dates)
    renderSlotSelector()
  } catch (e) {
    appRoot().innerHTML = `<p class="text-center text-red-500 py-24">${escapeHtml(apiErrorMessage(e, '쇼룸 정보를 불러오지 못했습니다.'))}</p>`
  }
}

function formatDateLabel(dateStr) {
  const d = dayjs(dateStr)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.format('M/D')} (${days[d.day()]})`
}

function renderDateSelector(dates) {
  const container = document.getElementById('date-selector')
  if (!container) return
  if (dates.length === 0) {
    container.innerHTML = `<p class="text-neutral-400 text-sm">예약 가능한 날짜가 없습니다.</p>`
    return
  }
  container.innerHTML = dates.map((d) => `
    <button data-date="${d}" class="date-btn shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition ${d === detailState.selectedDate ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 hover:border-neutral-400'}">
      ${formatDateLabel(d)}
    </button>
  `).join('')

  container.querySelectorAll('.date-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      detailState.selectedDate = btn.dataset.date
      detailState.selectedSlot = null
      renderDateSelector(dates)
      renderSlotSelector()
      document.getElementById('reservation-confirm-panel').innerHTML = ''
    })
  })
}

function renderSlotSelector() {
  const container = document.getElementById('slot-selector')
  if (!container) return

  const slotsForDate = detailState.slots.filter((s) => s.slot_date === detailState.selectedDate)

  if (slotsForDate.length === 0) {
    container.innerHTML = `<p class="text-neutral-400 text-sm py-6">선택하신 날짜에 예약 가능한 시간이 없습니다.</p>`
    return
  }

  container.innerHTML = `
    <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
      ${slotsForDate.map((s) => {
        const isSelected = detailState.selectedSlot && detailState.selectedSlot.id === s.id
        const base = 'slot-btn px-3 py-2.5 rounded-xl text-sm font-medium border text-center'
        if (!s.is_available) {
          return `<button disabled class="${base} bg-neutral-100 text-neutral-300 border-neutral-100 cursor-not-allowed">${s.start_time}</button>`
        }
        return `<button data-slot-id="${s.id}" class="slot-pick-btn ${base} ${isSelected ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-neutral-200 hover:border-amber-500'}">${s.start_time}</button>`
      }).join('')}
    </div>
  `

  container.querySelectorAll('.slot-pick-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slotId = Number(btn.dataset.slotId)
      const slot = detailState.slots.find((s) => s.id === slotId)
      detailState.selectedSlot = slot
      renderSlotSelector()
      renderConfirmPanel()
    })
  })
}

function renderConfirmPanel() {
  const panel = document.getElementById('reservation-confirm-panel')
  const slot = detailState.selectedSlot
  if (!slot) { panel.innerHTML = ''; return }

  panel.innerHTML = `
    <div class="fade-in bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p class="text-sm text-neutral-700 mb-3">
        <span class="font-bold">${formatDateLabel(slot.slot_date)} ${slot.start_time} ~ ${slot.end_time}</span> 방문을 예약하시겠습니까?
      </p>
      <textarea id="reservation-memo" placeholder="요청사항 (선택)" class="w-full text-sm border border-neutral-200 rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400" rows="2"></textarea>
      <div class="flex gap-2">
        <button id="confirm-reservation-btn" class="btn-primary flex-1 py-2.5 rounded-lg font-medium">예약 확정</button>
        <button id="cancel-select-btn" class="btn-outline px-4 py-2.5 rounded-lg font-medium">취소</button>
      </div>
    </div>
  `

  document.getElementById('cancel-select-btn').addEventListener('click', () => {
    detailState.selectedSlot = null
    renderSlotSelector()
    panel.innerHTML = ''
  })

  document.getElementById('confirm-reservation-btn').addEventListener('click', async () => {
    if (!currentUser) {
      requireLogin(`#/showrooms/${detailState.showroomId}`)
      return
    }
    const memo = document.getElementById('reservation-memo').value
    const btn = document.getElementById('confirm-reservation-btn')
    btn.disabled = true
    btn.textContent = '예약 처리 중...'
    try {
      await axios.post('/reservations', { time_slot_id: slot.id, memo })
      toast('예약이 완료되었습니다!', 'success')
      navigate('#/my')
    } catch (e) {
      toast(apiErrorMessage(e, '예약에 실패했습니다.'), 'error')
      btn.disabled = false
      btn.textContent = '예약 확정'
      renderShowroomDetail(detailState.showroomId)
    }
  })
}

// ==================== Pages: Login / Signup ====================

function renderLogin(next) {
  appRoot().innerHTML = `
    <div class="max-w-md mx-auto fade-in">
      <h1 class="text-2xl font-bold mb-6 text-center">로그인</h1>
      <form id="login-form" class="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">이메일</label>
          <input type="email" id="login-email" required class="w-full border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="you@example.com" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">비밀번호</label>
          <input type="password" id="login-password" required class="w-full border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="••••••••" />
        </div>
        <button type="submit" class="btn-primary w-full py-2.5 rounded-lg font-medium">로그인</button>
        <p class="text-center text-sm text-neutral-500">
          계정이 없으신가요? <a href="#/signup" class="text-amber-600 font-medium hover:underline">회원가입</a>
        </p>
        <p class="text-center text-xs text-neutral-400 pt-2 border-t border-neutral-100">
          테스트 계정: user@brooks.com / user1234<br/>관리자 계정: admin@brooks.com / admin1234
        </p>
      </form>
    </div>
  `

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value
    const submitBtn = e.target.querySelector('button[type="submit"]')
    submitBtn.disabled = true
    try {
      const res = await axios.post('/auth/login', { email, password })
      setToken(res.data.token)
      currentUser = res.data.user
      renderNav()
      toast(`${currentUser.name}님, 환영합니다!`, 'success')
      navigate(next ? `#${next.replace(/^#/, '')}` : '#/showrooms')
    } catch (err) {
      toast(apiErrorMessage(err, '로그인에 실패했습니다.'), 'error')
      submitBtn.disabled = false
    }
  })
}

function renderSignup(next) {
  appRoot().innerHTML = `
    <div class="max-w-md mx-auto fade-in">
      <h1 class="text-2xl font-bold mb-6 text-center">회원가입</h1>
      <form id="signup-form" class="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">이름</label>
          <input type="text" id="signup-name" required class="w-full border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">이메일</label>
          <input type="email" id="signup-email" required class="w-full border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">연락처</label>
          <input type="tel" id="signup-phone" placeholder="010-0000-0000" class="w-full border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">비밀번호 (6자 이상)</label>
          <input type="password" id="signup-password" required minlength="6" class="w-full border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <button type="submit" class="btn-primary w-full py-2.5 rounded-lg font-medium">회원가입</button>
        <p class="text-center text-sm text-neutral-500">
          이미 계정이 있으신가요? <a href="#/login" class="text-amber-600 font-medium hover:underline">로그인</a>
        </p>
      </form>
    </div>
  `

  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = document.getElementById('signup-name').value
    const email = document.getElementById('signup-email').value
    const phone = document.getElementById('signup-phone').value
    const password = document.getElementById('signup-password').value
    const submitBtn = e.target.querySelector('button[type="submit"]')
    submitBtn.disabled = true
    try {
      const res = await axios.post('/auth/signup', { name, email, phone, password })
      setToken(res.data.token)
      currentUser = res.data.user
      renderNav()
      toast('회원가입이 완료되었습니다!', 'success')
      navigate(next ? `#${next.replace(/^#/, '')}` : '#/showrooms')
    } catch (err) {
      toast(apiErrorMessage(err, '회원가입에 실패했습니다.'), 'error')
      submitBtn.disabled = false
    }
  })
}

// ==================== Pages: My Reservations ====================

async function renderMyReservations() {
  if (!requireLogin('#/my')) return

  appRoot().innerHTML = loadingHtml()
  try {
    const res = await axios.get('/reservations/my')
    const reservations = res.data.reservations

    appRoot().innerHTML = `
      <div class="fade-in max-w-3xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">내 예약</h1>
        <div id="my-reservation-list" class="space-y-3"></div>
      </div>
    `

    const list = document.getElementById('my-reservation-list')
    if (reservations.length === 0) {
      list.innerHTML = `<p class="text-neutral-400 text-center py-16">예약 내역이 없습니다. <a href="#/showrooms" class="text-amber-600 hover:underline">쇼룸 예약하러 가기</a></p>`
      return
    }

    list.innerHTML = reservations.map((r) => `
      <div class="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-bold">${escapeHtml(r.showroom_name)}</span>
            <span class="badge ${r.status === 'confirmed' ? 'badge-confirmed' : 'badge-cancelled'}">${r.status === 'confirmed' ? '예약확정' : '취소됨'}</span>
          </div>
          <p class="text-sm text-neutral-500">${formatDateLabel(r.slot_date)} ${r.start_time} ~ ${r.end_time}</p>
          <p class="text-xs text-neutral-400 mt-1"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(r.showroom_address)}</p>
          ${r.memo ? `<p class="text-xs text-neutral-400 mt-1">메모: ${escapeHtml(r.memo)}</p>` : ''}
        </div>
        ${r.status === 'confirmed' ? `<button data-id="${r.id}" class="cancel-reservation-btn btn-outline px-4 py-2 rounded-lg text-sm shrink-0">예약 취소</button>` : ''}
      </div>
    `).join('')

    list.querySelectorAll('.cancel-reservation-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('예약을 취소하시겠습니까?')) return
        try {
          await axios.delete(`/reservations/${btn.dataset.id}`)
          toast('예약이 취소되었습니다.', 'success')
          renderMyReservations()
        } catch (e) {
          toast(apiErrorMessage(e, '예약 취소에 실패했습니다.'), 'error')
        }
      })
    })
  } catch (e) {
    appRoot().innerHTML = `<p class="text-center text-red-500 py-24">${escapeHtml(apiErrorMessage(e, '예약 내역을 불러오지 못했습니다.'))}</p>`
  }
}

// ==================== Pages: Admin ====================

function adminTabsHtml(activeTab) {
  const tabs = [
    { key: 'reservations', label: '예약 관리', icon: 'fa-calendar-check' },
    { key: 'users', label: '회원 관리', icon: 'fa-users' },
    { key: 'showrooms', label: '쇼룸 관리', icon: 'fa-store' }
  ]
  return `
    <div class="flex gap-2 mb-6 border-b border-neutral-200">
      ${tabs.map((t) => `
        <a href="#/admin?tab=${t.key}" class="px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${activeTab === t.key ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'}">
          <i class="fa-solid ${t.icon} mr-1.5"></i>${t.label}
        </a>
      `).join('')}
    </div>
  `
}

async function renderAdmin(tab) {
  if (!requireAdmin()) return

  appRoot().innerHTML = `
    <div class="fade-in">
      <h1 class="text-2xl font-bold mb-2">관리자 페이지</h1>
      <p class="text-neutral-500 mb-4">예약, 회원, 쇼룸을 관리합니다.</p>
      ${adminTabsHtml(tab)}
      <div id="admin-content">${loadingHtml()}</div>
    </div>
  `

  if (tab === 'users') return renderAdminUsers()
  if (tab === 'showrooms') return renderAdminShowrooms()
  return renderAdminReservations()
}

// ---------- Admin: Reservations ----------

async function renderAdminReservations() {
  const content = document.getElementById('admin-content')
  try {
    const [resRes, showroomRes] = await Promise.all([
      axios.get('/admin/reservations'),
      axios.get('/admin/showrooms')
    ])
    const reservations = resRes.data.reservations
    const showrooms = showroomRes.data.showrooms

    content.innerHTML = `
      <div class="flex flex-wrap gap-3 mb-4">
        <select id="filter-showroom" class="border border-neutral-200 rounded-lg px-3 py-2 text-sm">
          <option value="">전체 지점</option>
          ${showrooms.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
        </select>
        <select id="filter-status" class="border border-neutral-200 rounded-lg px-3 py-2 text-sm">
          <option value="">전체 상태</option>
          <option value="confirmed">예약확정</option>
          <option value="cancelled">취소됨</option>
        </select>
        <input type="date" id="filter-date" class="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
        <button id="filter-apply" class="btn-outline px-4 py-2 rounded-lg text-sm">필터 적용</button>
      </div>
      <div class="overflow-x-auto bg-white border border-neutral-200 rounded-xl">
        <table class="w-full text-sm">
          <thead class="bg-neutral-50 text-neutral-500 text-left">
            <tr>
              <th class="px-4 py-3">지점</th>
              <th class="px-4 py-3">일시</th>
              <th class="px-4 py-3">예약자</th>
              <th class="px-4 py-3">연락처</th>
              <th class="px-4 py-3">상태</th>
              <th class="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody id="reservation-table-body" class="divide-y divide-neutral-100"></tbody>
        </table>
      </div>
    `

    function renderRows(rows) {
      const body = document.getElementById('reservation-table-body')
      if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="text-center text-neutral-400 py-12">예약 내역이 없습니다.</td></tr>`
        return
      }
      body.innerHTML = rows.map((r) => `
        <tr>
          <td class="px-4 py-3">${escapeHtml(r.showroom_name)}</td>
          <td class="px-4 py-3">${formatDateLabel(r.slot_date)} ${r.start_time}~${r.end_time}</td>
          <td class="px-4 py-3">${escapeHtml(r.user_name)}<br/><span class="text-xs text-neutral-400">${escapeHtml(r.user_email)}</span></td>
          <td class="px-4 py-3">${escapeHtml(r.user_phone || '-')}</td>
          <td class="px-4 py-3"><span class="badge ${r.status === 'confirmed' ? 'badge-confirmed' : 'badge-cancelled'}">${r.status === 'confirmed' ? '예약확정' : '취소됨'}</span></td>
          <td class="px-4 py-3">
            <div class="flex gap-1.5">
              ${r.status === 'confirmed' ? `<button data-id="${r.id}" data-action="cancel" class="admin-res-action text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100">취소</button>` : `<button data-id="${r.id}" data-action="restore" class="admin-res-action text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100">복원</button>`}
              <button data-id="${r.id}" data-action="delete" class="admin-res-action text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">삭제</button>
            </div>
          </td>
        </tr>
      `).join('')

      body.querySelectorAll('.admin-res-action').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id
          const action = btn.dataset.action
          try {
            if (action === 'cancel') {
              await axios.patch(`/admin/reservations/${id}`, { status: 'cancelled' })
              toast('예약이 취소되었습니다.', 'success')
            } else if (action === 'restore') {
              await axios.patch(`/admin/reservations/${id}`, { status: 'confirmed' })
              toast('예약이 복원되었습니다.', 'success')
            } else if (action === 'delete') {
              if (!confirm('이 예약을 완전히 삭제하시겠습니까?')) return
              await axios.delete(`/admin/reservations/${id}`)
              toast('예약이 삭제되었습니다.', 'success')
            }
            renderAdminReservations()
          } catch (e) {
            toast(apiErrorMessage(e, '처리에 실패했습니다.'), 'error')
          }
        })
      })
    }

    renderRows(reservations)

    document.getElementById('filter-apply').addEventListener('click', async () => {
      const showroomId = document.getElementById('filter-showroom').value
      const status = document.getElementById('filter-status').value
      const date = document.getElementById('filter-date').value
      const params = {}
      if (showroomId) params.showroom_id = showroomId
      if (status) params.status = status
      if (date) params.date = date
      try {
        const res = await axios.get('/admin/reservations', { params })
        renderRows(res.data.reservations)
      } catch (e) {
        toast(apiErrorMessage(e, '조회에 실패했습니다.'), 'error')
      }
    })
  } catch (e) {
    content.innerHTML = `<p class="text-center text-red-500 py-16">${escapeHtml(apiErrorMessage(e, '데이터를 불러오지 못했습니다.'))}</p>`
  }
}

// ---------- Admin: Users ----------

async function renderAdminUsers() {
  const content = document.getElementById('admin-content')
  try {
    const res = await axios.get('/admin/users')
    const users = res.data.users

    content.innerHTML = `
      <div class="overflow-x-auto bg-white border border-neutral-200 rounded-xl">
        <table class="w-full text-sm">
          <thead class="bg-neutral-50 text-neutral-500 text-left">
            <tr>
              <th class="px-4 py-3">이름</th>
              <th class="px-4 py-3">이메일</th>
              <th class="px-4 py-3">연락처</th>
              <th class="px-4 py-3">가입일</th>
              <th class="px-4 py-3">예약수</th>
              <th class="px-4 py-3">권한</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((u) => `
              <tr class="border-t border-neutral-100">
                <td class="px-4 py-3 font-medium">${escapeHtml(u.name)}</td>
                <td class="px-4 py-3">${escapeHtml(u.email)}</td>
                <td class="px-4 py-3">${escapeHtml(u.phone || '-')}</td>
                <td class="px-4 py-3 text-neutral-400">${dayjs(u.created_at).format('YYYY-MM-DD')}</td>
                <td class="px-4 py-3">${u.reservation_count}</td>
                <td class="px-4 py-3">${u.is_admin ? '<span class="badge badge-admin">관리자</span>' : '일반회원'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  } catch (e) {
    content.innerHTML = `<p class="text-center text-red-500 py-16">${escapeHtml(apiErrorMessage(e, '회원 정보를 불러오지 못했습니다.'))}</p>`
  }
}

// ---------- Admin: Showrooms & Time Slots ----------

async function renderAdminShowrooms() {
  const content = document.getElementById('admin-content')
  try {
    const res = await axios.get('/admin/showrooms')
    const showrooms = res.data.showrooms

    content.innerHTML = `
      <div class="mb-4 flex justify-end">
        <button id="new-showroom-btn" class="btn-primary px-4 py-2 rounded-lg text-sm"><i class="fa-solid fa-plus mr-1"></i>새 쇼룸 추가</button>
      </div>
      <div id="new-showroom-form-wrap"></div>
      <div id="showroom-admin-list" class="space-y-4"></div>
    `

    document.getElementById('new-showroom-btn').addEventListener('click', () => {
      renderShowroomForm(document.getElementById('new-showroom-form-wrap'), null, () => renderAdminShowrooms())
    })

    const listEl = document.getElementById('showroom-admin-list')
    listEl.innerHTML = showrooms.map((s) => `
      <div class="bg-white border border-neutral-200 rounded-xl p-5">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-bold text-lg">${escapeHtml(s.name)}</h3>
              ${s.is_active ? '' : '<span class="badge badge-cancelled">비활성</span>'}
            </div>
            <p class="text-sm text-neutral-500"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(s.address)}</p>
            <p class="text-sm text-neutral-400 mt-1">${escapeHtml(s.description || '')}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button data-id="${s.id}" class="edit-showroom-btn btn-outline px-3 py-1.5 rounded-lg text-sm">수정</button>
            <button data-id="${s.id}" class="manage-slots-btn btn-outline px-3 py-1.5 rounded-lg text-sm">시간대 관리</button>
            <button data-id="${s.id}" class="toggle-active-btn btn-outline px-3 py-1.5 rounded-lg text-sm">${s.is_active ? '비활성화' : '활성화'}</button>
          </div>
        </div>
        <div id="showroom-edit-form-${s.id}"></div>
        <div id="showroom-slots-${s.id}" class="mt-4"></div>
      </div>
    `).join('')

    listEl.querySelectorAll('.edit-showroom-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = showrooms.find((x) => x.id === Number(btn.dataset.id))
        const wrap = document.getElementById(`showroom-edit-form-${s.id}`)
        if (wrap.innerHTML) { wrap.innerHTML = ''; return }
        renderShowroomForm(wrap, s, () => renderAdminShowrooms())
      })
    })

    listEl.querySelectorAll('.toggle-active-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        const s = showrooms.find((x) => x.id === Number(id))
        try {
          await axios.patch(`/admin/showrooms/${id}`, { is_active: !s.is_active })
          toast('업데이트 되었습니다.', 'success')
          renderAdminShowrooms()
        } catch (e) {
          toast(apiErrorMessage(e, '처리에 실패했습니다.'), 'error')
        }
      })
    })

    listEl.querySelectorAll('.manage-slots-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        const wrap = document.getElementById(`showroom-slots-${id}`)
        if (wrap.dataset.loaded === '1') {
          wrap.innerHTML = ''
          wrap.dataset.loaded = ''
          return
        }
        renderSlotManager(wrap, id)
        wrap.dataset.loaded = '1'
      })
    })
  } catch (e) {
    content.innerHTML = `<p class="text-center text-red-500 py-16">${escapeHtml(apiErrorMessage(e, '쇼룸 정보를 불러오지 못했습니다.'))}</p>`
  }
}

function renderShowroomForm(container, showroom, onSaved) {
  const isEdit = !!showroom
  container.innerHTML = `
    <form class="showroom-form fade-in mt-4 bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
      <div class="grid sm:grid-cols-2 gap-3">
        <input name="name" required placeholder="지점명" value="${escapeHtml(showroom?.name || '')}" class="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
        <input name="address" required placeholder="주소" value="${escapeHtml(showroom?.address || '')}" class="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      <input name="image_url" placeholder="이미지 URL" value="${escapeHtml(showroom?.image_url || '')}" class="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
      <textarea name="description" placeholder="설명" rows="2" class="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">${escapeHtml(showroom?.description || '')}</textarea>
      <div class="flex gap-2">
        <button type="submit" class="btn-primary px-4 py-2 rounded-lg text-sm">${isEdit ? '수정 완료' : '추가'}</button>
        <button type="button" class="cancel-form-btn btn-outline px-4 py-2 rounded-lg text-sm">취소</button>
      </div>
    </form>
  `

  container.querySelector('.cancel-form-btn').addEventListener('click', () => { container.innerHTML = '' })

  container.querySelector('.showroom-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = {
      name: fd.get('name'),
      address: fd.get('address'),
      description: fd.get('description'),
      image_url: fd.get('image_url')
    }
    try {
      if (isEdit) {
        await axios.patch(`/admin/showrooms/${showroom.id}`, payload)
      } else {
        await axios.post('/admin/showrooms', payload)
      }
      toast('저장되었습니다.', 'success')
      onSaved()
    } catch (e2) {
      toast(apiErrorMessage(e2, '저장에 실패했습니다.'), 'error')
    }
  })
}

async function renderSlotManager(container, showroomId) {
  container.innerHTML = loadingHtml()
  try {
    const res = await axios.get(`/admin/showrooms/${showroomId}/slots`)
    const slots = res.data.slots

    const grouped = {}
    slots.forEach((s) => {
      grouped[s.slot_date] = grouped[s.slot_date] || []
      grouped[s.slot_date].push(s)
    })
    const dates = Object.keys(grouped).sort()

    container.innerHTML = `
      <div class="border-t border-neutral-200 pt-4 mt-2">
        <form class="add-slot-form flex flex-wrap gap-2 mb-4 items-end">
          <div>
            <label class="block text-xs text-neutral-500 mb-1">날짜</label>
            <input type="date" name="slot_date" required class="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs text-neutral-500 mb-1">시작</label>
            <input type="time" name="start_time" required class="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs text-neutral-500 mb-1">종료</label>
            <input type="time" name="end_time" required class="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" class="btn-primary px-4 py-2 rounded-lg text-sm">시간대 추가</button>
        </form>
        <div class="space-y-3">
          ${dates.length === 0 ? '<p class="text-neutral-400 text-sm">등록된 시간대가 없습니다.</p>' : dates.map((d) => `
            <div>
              <p class="text-xs font-bold text-neutral-500 mb-1.5">${formatDateLabel(d)}</p>
              <div class="flex flex-wrap gap-1.5">
                ${grouped[d].map((s) => `
                  <span class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${s.reservation_id ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-neutral-200'}">
                    ${s.start_time}~${s.end_time} ${s.reservation_id ? '<i class="fa-solid fa-user text-amber-600"></i>' : ''}
                    <button data-id="${s.id}" class="delete-slot-btn text-neutral-400 hover:text-red-500 ml-1"><i class="fa-solid fa-xmark"></i></button>
                  </span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `

    container.querySelector('.add-slot-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      try {
        await axios.post(`/admin/showrooms/${showroomId}/slots`, {
          slot_date: fd.get('slot_date'),
          start_time: fd.get('start_time'),
          end_time: fd.get('end_time')
        })
        toast('시간대가 추가되었습니다.', 'success')
        renderSlotManager(container, showroomId)
      } catch (err) {
        toast(apiErrorMessage(err, '추가에 실패했습니다.'), 'error')
      }
    })

    container.querySelectorAll('.delete-slot-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('이 시간대를 삭제하시겠습니까?')) return
        try {
          await axios.delete(`/admin/slots/${btn.dataset.id}`)
          toast('삭제되었습니다.', 'success')
          renderSlotManager(container, showroomId)
        } catch (err) {
          toast(apiErrorMessage(err, '삭제에 실패했습니다.'), 'error')
        }
      })
    })
  } catch (e) {
    container.innerHTML = `<p class="text-red-500 text-sm">${escapeHtml(apiErrorMessage(e, '시간대 정보를 불러오지 못했습니다.'))}</p>`
  }
}

// ==================== Init ====================

window.addEventListener('hashchange', router)
window.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentUser()
  renderNav()
  router()
})
