import dayjs from 'dayjs'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export function formatDateLabel(dateStr: string): string {
  const d = dayjs(dateStr)
  return `${d.format('M/D')} (${DAYS[d.day()]})`
}

export function formatDateTime(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD')
}
