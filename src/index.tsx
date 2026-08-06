import { Hono } from 'hono'
import type { Bindings } from './utils/types'
import authRoutes from './routes/auth'
import showroomRoutes from './routes/showrooms'
import reservationRoutes from './routes/reservations'
import adminRoutes from './routes/admin'

// This Worker only handles /api/* routes (see public/_routes.json).
// The React SPA (built from frontend/ into public/) is served directly
// by Cloudflare Pages as static assets — the Worker never touches it.
const app = new Hono<{ Bindings: Bindings }>()

app.route('/api/auth', authRoutes)
app.route('/api/showrooms', showroomRoutes)
app.route('/api/reservations', reservationRoutes)
app.route('/api/admin', adminRoutes)

export default app
