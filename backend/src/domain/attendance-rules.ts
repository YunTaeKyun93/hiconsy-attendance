import {
  seoulToInstant,
  timeToSeconds,
  toSeoulTime,
  truncateToSecond,
  type DateStr,
} from '../common/date-time.js';
import { DayType, type Judgement, type TimeWindow } from './types.js';

// DESIGN.md 4-1
const CHECK_IN_OPEN = timeToSeconds('07:00:00');
const LATE_AFTER = timeToSeconds('10:00:00');
const CHECK_OUT_OPEN = timeToSeconds('16:00:00');
const END_OF_DAY = '23:59:59';

export type AttendanceRejectReason =
  | 'NON_WORKDAY' // 주말·공휴일이고 승인된 주말 근무 없음
  | 'ANNUAL' // 연차일
  | 'TOO_EARLY' // 출근 07:00 전, 퇴근 16:00 전
  | 'OUTSIDE_WINDOW' // 주말 근무 신청 시간대 밖
  | 'MISSING_WINDOW'; // 주말 근무인데 시간대가 넘어오지 않음(호출 오류)

function seoulSeconds(instant: Date): number {
  return timeToSeconds(toSeoulTime(instant));
}

function inWindow(instant: Date, window: TimeWindow): boolean {
  const t = seoulSeconds(instant);
  return timeToSeconds(window.start) <= t && t <= timeToSeconds(window.end);
}

/** 출근 버튼. dayType은 now의 한국 날짜 기준 유형이어야 한다. */
export function judgeCheckIn(
  dayType: DayType,
  now: Date,
  window?: TimeWindow,
): Judgement<AttendanceRejectReason> {
  switch (dayType) {
    case DayType.NON_WORKDAY:
      return { ok: false, reason: 'NON_WORKDAY' };
    case DayType.ANNUAL:
      return { ok: false, reason: 'ANNUAL' };
    case DayType.WEEKEND_WORK:
      if (!window) return { ok: false, reason: 'MISSING_WINDOW' };
      return inWindow(now, window) ? { ok: true } : { ok: false, reason: 'OUTSIDE_WINDOW' };
    default:
      return seoulSeconds(now) >= CHECK_IN_OPEN ? { ok: true } : { ok: false, reason: 'TOO_EARLY' };
  }
}

/** 지각 여부. 판정이 없는 유형은 null. 초 아래 버림: 10:00:00 정상, 10:00:01 지각. */
export function isLate(dayType: DayType, checkInAt: Date): boolean | null {
  if (dayType !== DayType.WORKDAY && dayType !== DayType.REMOTE) return null;
  return seoulSeconds(checkInAt) > LATE_AFTER;
}

/** 퇴근 버튼. 직접 입력은 manualCheckOutRange를 쓴다. */
export function judgeButtonCheckOut(
  dayType: DayType,
  now: Date,
  window?: TimeWindow,
): Judgement<AttendanceRejectReason> {
  switch (dayType) {
    case DayType.NON_WORKDAY:
      return { ok: false, reason: 'NON_WORKDAY' };
    case DayType.ANNUAL:
      return { ok: false, reason: 'ANNUAL' };
    case DayType.HALF_OFF:
      return { ok: true };
    case DayType.WEEKEND_WORK:
      if (!window) return { ok: false, reason: 'MISSING_WINDOW' };
      return inWindow(now, window) ? { ok: true } : { ok: false, reason: 'OUTSIDE_WINDOW' };
    default:
      return seoulSeconds(now) >= CHECK_OUT_OPEN ? { ok: true } : { ok: false, reason: 'TOO_EARLY' };
  }
}

export interface InstantRange {
  min: Date;
  max: Date;
}

/**
 * 미기록 퇴근 직접 입력 허용 범위 (DESIGN.md 4-3).
 * 그날 출근 시각 이후 ~ 그날 23:59:59. WEEKEND_WORK는 출근 이후 ~ 신청 종료 시각. 16:00 제한 없음.
 */
export function manualCheckOutRange(
  dayType: DayType,
  workDate: DateStr,
  checkInAt: Date,
  window?: TimeWindow,
): InstantRange {
  if (dayType === DayType.WEEKEND_WORK) {
    if (!window) throw new Error('WEEKEND_WORK 직접 입력에는 신청 시간대가 필요합니다.');
    return { min: checkInAt, max: seoulToInstant(workDate, window.end) };
  }
  return { min: checkInAt, max: seoulToInstant(workDate, END_OF_DAY) };
}

/** 범위 안인지(양 끝 포함, 초 아래 버림) */
export function isInRange(value: Date, range: InstantRange): boolean {
  const v = truncateToSecond(value);
  return truncateToSecond(range.min) <= v && v <= range.max.getTime();
}

/** 퇴근이 비어 있는 과거 날짜(오름차순). 하나라도 있으면 서버가 출근을 거부한다. */
export function findUnrecordedDates(
  rows: ReadonlyArray<{ workDate: DateStr; checkOutAt: Date | null }>,
  today: DateStr,
): DateStr[] {
  return rows
    .filter((r) => r.checkOutAt === null && r.workDate < today)
    .map((r) => r.workDate)
    .sort();
}
