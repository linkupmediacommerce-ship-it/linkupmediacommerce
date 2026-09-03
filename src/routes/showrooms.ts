import { Hono } from 'hono'
import type { Bindings } from '../utils/types'

const showrooms = new Hono<{ Bindings: Bindings }>()

// GET /api/showrooms - list active showrooms across ALL brands (single mixed feed, MVP).
showrooms.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT s.id, s.name, s.address, s.description, s.image_url, s.brand_id,
      b.name AS brand_name, b.slug AS brand_slug
     FROM showrooms s
     JOIN brands b ON b.id = s.brand_id
     WHERE s.is_active = 1 AND b.is_active = 1
     ORDER BY s.id ASC`
  ).all()
  return c.json({ showrooms: results })
})

// GET /api/showrooms/:id - showroom detail
showrooms.get('/:id', async (c) => {
  const id = c.req.param('id')
  const showroom = await c.env.DB.prepare(
    `SELECT s.id, s.name, s.address, s.description, s.image_url, s.brand_id,
      b.name AS brand_name, b.slug AS brand_slug
     FROM showrooms s
     JOIN brands b ON b.id = s.brand_id
     WHERE s.id = ? AND s.is_active = 1 AND b.is_active = 1`
  )
    .bind(id)
    .first()
  if (!showroom) {
    return c.json({ error: '쇼룸을 찾을 수 없습니다.' }, 404)
  }
  return c.json({ showroom })
})

// GET /api/showrooms/:id/slots?date=YYYY-MM-DD - available time slots
// If no date provided, returns all future available slots grouped implicitly by date (client can group)
showrooms.get('/:id/slots', async (c) => {
  const id = c.req.param('id')
  const date = c.req.query('date')

  const showroom = await c.env.DB.prepare(
    `SELECT s.id FROM showrooms s JOIN brands b ON b.id = s.brand_id
     WHERE s.id = ? AND s.is_active = 1 AND b.is_active = 1`
  )
    .bind(id)
    .first()
  if (!showroom) {
    return c.json({ error: '쇼룸을 찾을 수 없습니다.' }, 404)
  }

  let query = `
    SELECT ts.id, ts.slot_date, ts.start_time, ts.capacity,
      (SELECT COUNT(*) FROM reservations r WHERE r.time_slot_id = ts.id AND r.status = 'confirmed') AS reserved_count
    FROM time_slots ts
    WHERE ts.showroom_id = ? AND ts.is_active = 1 AND ts.slot_date >= date('now')
  `
  const params: (string | number)[] = [id]

  if (date) {
    query += ' AND ts.slot_date = ?'
    params.push(date)
  }
  query += ' ORDER BY ts.slot_date ASC, ts.start_time ASC'

  const stmt = c.env.DB.prepare(query).bind(...params)
  const { results } = await stmt.all()

  const slots = (results as any[]).map((s) => {
    const remaining = Math.max(0, s.capacity - s.reserved_count)
    return { ...s, remaining, is_available: remaining > 0 }
  })
  return c.json({ slots })
})

export default showrooms
