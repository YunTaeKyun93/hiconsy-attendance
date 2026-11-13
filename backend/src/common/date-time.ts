// 날짜·시각 유틸 모음. 모든 판정은 Asia/Seoul 기준이며 서버 OS 시간대에 의존하지 않는다.
// 한국은 일광절약시간이 없으므로 KST = UTC+09:00 고정이다.

/** 'YYYY-MM-DD' (한국 날짜) */
export type DateStr = string;
/** 'HH:MM:SS' (한국 시각) */
export type TimeStr = string;

export const TIME_ZONE = 'Asia/Seoul';
const KST_OFFSET = '+09:00';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

const seoulFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function seoulParts(instant: Date): Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string> {
  const parts: Record<string, string> = {};
  for (const p of seoulFormatter.formatToParts(instant)) parts[p.type] = p.value;
  return parts as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string>;
}

function parseDate(date: DateStr): [number, number, number] {
  const m = DATE_RE.exec(date);
  if (!m || !isValidDateStr(date)) throw new RangeError(`잘못된 날짜: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function formatUtcDate(ms: number): DateStr {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 시각 → 한국 날짜 'YYYY-MM-DD' */
export function toSeoulDate(instant: Date): DateStr {
  const p = seoulParts(instant);
  return `${p.year}-${p.month}-${p.day}`;
}

/** 시각 → 한국 시각 'HH:MM:SS' (초 아래 버림) */
export function toSeoulTime(instant: Date): TimeStr {
  const p = seoulParts(instant);
  return `${p.hour}:${p.minute}:${p.second}`;
}

/** 한국 날짜 + 한국 시각 → 실제 순간 */
export function seoulToInstant(date: DateStr, time: TimeStr): Date {
  parseDate(date);
  if (!isValidTimeStr(time)) throw new RangeError(`잘못된 시각: ${time}`);
  return new Date(`${date}T${time}${KST_OFFSET}`);
}

/** 초 아래를 버린 epoch 밀리초 */
export function truncateToSecond(instant: Date): number {
  return Math.floor(instant.getTime() / 1000) * 1000;
}

export function addDays(date: DateStr, days: number): DateStr {
  const [y, m, d] = parseDate(date);
  return formatUtcDate(Date.UTC(y, m - 1, d + days));
}

/** n개월 뒤 같은 날. 그 날이 없는 달이면 말일. 예: 01-31 + 1개월 = 02-28 */
export function addMonthsClamped(date: DateStr, months: number): DateStr {
  const [y, m, d] = parseDate(date);
  const total = m - 1 + months;
  const year = y + Math.floor(total / 12);
  const monthIndex = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return formatUtcDate(Date.UTC(year, monthIndex, Math.min(d, lastDay)));
}

/** 0 = 일요일 … 6 = 토요일 */
export function dayOfWeek(date: DateStr): number {
  const [y, m, d] = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isWeekend(date: DateStr): boolean {
  const dow = dayOfWeek(date);
  return dow === 0 || dow === 6;
}

/** 'YYYY-MM' */
export function yearMonth(date: DateStr): string {
  parseDate(date);
  return date.slice(0, 7);
}

/** 'HH:MM:SS' → 자정부터 초 */
export function timeToSeconds(time: TimeStr): number {
  const m = TIME_RE.exec(time);
  if (!m) throw new RangeError(`잘못된 시각: ${time}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function isValidDateStr(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return formatUtcDate(Date.UTC(y, mo - 1, d)) === value && y >= 1000;
}

export function isValidTimeStr(value: string): boolean {
  return TIME_RE.test(value);
}

/** 'YYYY-MM' 형식인지 */
export function isValidMonthStr(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** 시각 → 'YYYY-MM-DD HH:MM:SS' (KST) */
export function toSeoulDateTime(instant: Date): string {
  return `${toSeoulDate(instant)} ${toSeoulTime(instant)}`;
}
