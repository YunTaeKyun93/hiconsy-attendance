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

/** 초 → 'H시간 M분' */
export function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

/** <input type="time">은 초를 빼고 'HH:MM'을 줄 때가 있다. 서버 형식 'HH:MM:SS'로 맞춘다. */
export function toTimeStr(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value
}
