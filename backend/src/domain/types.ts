import type { DateStr, TimeStr } from '../common/date-time.js';

/** 공휴일 날짜 집합. 판정 함수는 DB 대신 이 값을 받는다. */
export type HolidaySet = ReadonlySet<DateStr>;

/** 신청의 시간대 (REMOTE·WEEKEND_WORK) */
export interface TimeWindow {
  start: TimeStr;
  end: TimeStr;
}

/** DESIGN.md 3장 */
export const DayType = {
  WORKDAY: 'WORKDAY',
  REMOTE: 'REMOTE',
  HALF_OFF: 'HALF_OFF',
  ANNUAL: 'ANNUAL',
  WEEKEND_WORK: 'WEEKEND_WORK',
  NON_WORKDAY: 'NON_WORKDAY',
} as const;
export type DayType = (typeof DayType)[keyof typeof DayType];

export type Judgement<R extends string> = { ok: true } | { ok: false; reason: R };
