// 표시용 서식. 모든 시각은 Asia/Seoul로 보여준다(브라우저 시간대와 무관).

const TZ = 'Asia/Seoul'

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** ISO → 'HH:MM:SS' (KST) */
export function kstTime(iso: string | null | undefined): string {
  return iso ? timeFmt.format(new Date(iso)) : '-'
}

/** ISO → 'YYYY-MM-DD' (KST) */
export function kstDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

/** 'YYYY-MM-DD' → 'YYYY-MM-DD(요일)' */
export function withWeekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dow = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay()
  return `${date}(${WEEKDAYS[dow]})`
}

/** 'YYYY-MM-DD' → 'M/D'. 기준일(서버 오늘)과 연도가 다르면 'YYYY/M/D' */
export function shortDate(date: string, today: string): string {
  const [y, m, d] = date.split('-')
  const md = `${Number(m)}/${Number(d)}`
  return y === today.slice(0, 4) ? md : `${y}/${md}`
}

/** 초 → 'H시간 M분' */
export function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

/**
 * 24시간 텍스트 입력 → 'HH:MM:SS'. 형식이 틀리면 null.
 * 허용: '09:30', '9:30', '0930', '930', '18:30:15', '183015'
 */
export function parseTimeInput(raw: string): string | null {
  const s = raw.trim()
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s) ?? /^(\d{1,2})(\d{2})(\d{2})?$/.exec(s)
  if (!m) return null
  const [h = 0, mi = 0, se = 0] = [m[1], m[2], m[3] ?? '0'].map(Number)
  if (h > 23 || mi > 59 || se > 59) return null
  return [h, mi, se].map((n) => String(n).padStart(2, '0')).join(':')
}

/** 'HH:MM:SS' → 화면용. 초가 0이면 'HH:MM' */
export function timeLabel(t: string): string {
  return t.endsWith(':00') ? t.slice(0, 5) : t
}

/**
 * 날짜 텍스트 입력 → 'YYYY-MM-DD'. 없는 날짜거나 형식이 틀리면 null.
 * 허용: '2026-11-18', '2026.11.18', '2026/11/18', '20261118'
 */
export function parseDateInput(raw: string): string | null {
  const m = /^(\d{4})[-./]?(\d{1,2})[-./]?(\d{1,2})$/.exec(raw.trim())
  if (!m) return null
  const [y = 0, mo = 0, d = 0] = [m[1], m[2], m[3]].map(Number)
  const check = new Date(Date.UTC(y, mo - 1, d))
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
