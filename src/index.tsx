import { Hono } from 'hono'
import { renderer } from './renderer'
import type { Bindings } from './utils/types'
import authRoutes from './routes/auth'
import showroomRoutes from './routes/showrooms'
import reservationRoutes from './routes/reservations'
import adminRoutes from './routes/admin'

const app = new Hono<{ Bindings: Bindings }>()

// ---------------------- API Routes ----------------------
app.route('/api/auth', authRoutes)
app.route('/api/showrooms', showroomRoutes)
app.route('/api/reservations', reservationRoutes)
app.route('/api/admin', adminRoutes)

// ---------------------- Frontend (SPA shell) ----------------------
app.use(renderer)

app.get('*', (c) => {
  return c.render(
    <>
      <header id="site-header" class="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" class="flex items-center gap-2 text-xl font-bold tracking-tight text-neutral-900">
            <span class="text-amber-600"><i class="fa-solid fa-cube"></i></span>
            BROOKS
          </a>
          <nav id="nav-links" class="flex items-center gap-3 text-sm font-medium"></nav>
        </div>
      </header>
      <main id="app-root" class="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8"></main>
      <footer class="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400">
        © 2026 BROOKS Showroom Reservation. All rights reserved.
      </footer>
      <script src="/static/app.js"></script>
    </>,
    { title: '브룩스 쇼룸 예약' }
  )
})

export default app
