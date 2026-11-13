import {
  addDays,
  isWeekend,
  seoulToInstant,
  toSeoulDate,
  truncateToSecond,
  type DateStr,
} from '../common/date-time.js';
import { RequestType } from '../database/enums.js';
import type { HolidaySet } from './types.js';

export const REQUEST_DEADLINE_TIME = '17:00:00';

/** 영업일 = 주말과 공휴일이 아닌 날 */
export function isBusinessDay(date: DateStr, holidays: HolidaySet): boolean {
  return !isWeekend(date) && !holidays.has(date);
}

/** 대상일 직전 영업일 */
export function previousBusinessDay(date: DateStr, holidays: HolidaySet): DateStr {
  let d = addDays(date, -1);
  for (let i = 0; i < 366; i++) {
    if (isBusinessDay(d, holidays)) return d;
    d = addDays(d, -1);
  }
  throw new Error(`${date} 이전 1년 안에 영업일이 없습니다.`);
}

/** 신청 기한: 대상일 직전 영업일 17:00:00 (KST) */
export function requestDeadline(targetDate: DateStr, holidays: HolidaySet): Date {
  return seoulToInstant(previousBusinessDay(targetDate, holidays), REQUEST_DEADLINE_TIME);
}

/** 기한 안인지. 초 아래는 버린다(17:00:00.999는 기한 안, 17:00:01은 초과). */
export function isWithinDeadline(now: Date, targetDate: DateStr, holidays: HolidaySet): boolean {
  return truncateToSecond(now) <= requestDeadline(targetDate, holidays).getTime();
}

/** ANNUAL·REMOTE·OFF는 영업일만, WEEKEND_WORK는 주말·공휴일만 */
export function isValidTargetDate(type: RequestType, date: DateStr, holidays: HolidaySet): boolean {
  const business = isBusinessDay(date, holidays);
  return type === RequestType.WEEKEND_WORK ? !business : business;
}

/** 취소: 대상일 전날까지 (한국 날짜 기준 오늘 < 대상일) */
export function canCancel(now: Date, targetDate: DateStr): boolean {
  return toSeoulDate(now) < targetDate;
}

/** 승인: 대상일 0시(KST) 전까지만. 대상일이 지난 PENDING은 반려만 가능. */
export function canApprove(now: Date, targetDate: DateStr): boolean {
  return toSeoulDate(now) < targetDate;
}
