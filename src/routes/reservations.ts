import { Hono } from 'hono'
import type { Bindings, JwtPayload } from '../utils/types'
import { requireAuth } from '../utils/auth'

const reservations = new Hono<{ Bindings: Bindings }>()

// All reservation routes require authentication (members only)
reservations.use('*', requireAuth)

// POST /api/reservations - create a reservation
reservations.post('/', async (c) => {
  const user = c.get('user' as never) as JwtPayload
  const body = await c.req.json<{ time_slot_id?: number; memo?: string }>()
  const timeSlotId = body.time_slot_id

  if (!timeSlotId) {
    return c.json({ error: '예약할 시간대를 선택해주세요.' }, 400)
  }

  const slot = await c.env.DB.prepare(
    'SELECT id, showroom_id, slot_date, start_time FROM time_slots WHERE id = ? AND is_active = 1'
  )
    .bind(timeSlotId)
    .first<{ id: number; showroom_id: number; slot_date: string; start_time: string }>()

  if (!slot) {
    return c.json({ error: '유효하지 않은 시간대입니다.' }, 404)
  }

  // Check slot is not in the past
  const now = new Date()
  const slotDateTime = new Date(`${slot.slot_date}T${slot.start_time}:00`)
  if (slotDateTime < now) {
    return c.json({ error: '이미 지난 시간대는 예약할 수 없습니다.' }, 400)
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM reservations WHERE time_slot_id = ? AND status = 'confirmed'"
  )
    .bind(timeSlotId)
    .first()
  if (existing) {
    return c.json({ error: '이미 예약된 시간대입니다.' }, 409)
  }

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO reservations (user_id, showroom_id, time_slot_id, status, memo) VALUES (?, ?, ?, 'confirmed', ?)"
    )
      .bind(user.sub, slot.showroom_id, timeSlotId, body.memo || null)
      .run()

    return c.json({
      reservation: {
        id: result.meta.last_row_id,
        user_id: user.sub,
        showroom_id: slot.showroom_id,
        time_slot_id: timeSlotId,
        status: 'confirmed'
      }
    })
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ error: '이미 예약된 시간대입니다.' }, 409)
    }
    return c.json({ error: '예약 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// GET /api/reservations/my - list my reservations
reservations.get('/my', async (c) => {
  const user = c.get('user' as never) as JwtPayload
  const { results } = await c.env.DB.prepare(
    `
    SELECT r.id, r.status, r.memo, r.created_at,
      s.id AS showroom_id, s.name AS showroom_name, s.address AS showroom_address,
      ts.slot_date, ts.start_time, ts.end_time
    FROM reservations r
    JOIN showrooms s ON s.id = r.showroom_id
    JOIN time_slots ts ON ts.id = r.time_slot_id
    WHERE r.user_id = ?
    ORDER BY ts.slot_date DESC, ts.start_time DESC
  `
  )
    .bind(user.sub)
    .all()
  return c.json({ reservations: results })
})

// DELETE /api/reservations/:id - cancel my reservation
reservations.delete('/:id', async (c) => {
  const user = c.get('user' as never) as JwtPayload
  const id = c.req.param('id')

  const reservation = await c.env.DB.prepare('SELECT id, user_id, status FROM reservations WHERE id = ?')
    .bind(id)
    .first<{ id: number; user_id: number; status: string }>()

  if (!reservation) {
    return c.json({ error: '예약을 찾을 수 없습니다.' }, 404)
  }
  if (reservation.user_id !== user.sub) {
    return c.json({ error: '본인의 예약만 취소할 수 있습니다.' }, 403)
  }
  if (reservation.status === 'cancelled') {
    return c.json({ error: '이미 취소된 예약입니다.' }, 400)
  }

  await c.env.DB.prepare("UPDATE reservations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(id)
    .run()

  return c.json({ success: true })
})

export default reservations
