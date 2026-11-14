import { timeToSeconds, toSeoulTime, truncateToSecond } from '../common/date-time.js';
import { DayType } from './types.js';

const HOUR = 3600;
const LUNCH_CHECK_IN_LIMIT = timeToSeconds('11:30:00');
const LUNCH_CHECK_OUT_FROM = timeToSeconds('12:30:00');

/**
 * 점심 차감 (DESIGN.md 4-2). 제도 문구대로 구간이 근무에 포함될 때만 1시간.
 * 출근 ≤ 11:30:00 그리고 퇴근 ≥ 12:30:00 (초 단위 비교). 교체할 수 있도록 분리.
 */
export function lunchDeductionSeconds(checkInAt: Date, checkOutAt: Date): number {
  const tin = timeToSeconds(toSeoulTime(checkInAt));
  const tout = timeToSeconds(toSeoulTime(checkOutAt));
  return tin <= LUNCH_CHECK_IN_LIMIT && tout >= LUNCH_CHECK_OUT_FROM ? HOUR : 0;
}

/** 근무시간(초) = 퇴근 − 출근 − 점심. 초 아래 버림. */
export function workSeconds(checkInAt: Date, checkOutAt: Date): number {
  const diff = (truncateToSecond(checkOutAt) - truncateToSecond(checkInAt)) / 1000;
  if (diff < 0) throw new RangeError('퇴근 시각이 출근 시각보다 이릅니다.');
  return diff - lunchDeductionSeconds(checkInAt, checkOutAt);
}

/** 조퇴 기준 근무시간(초). WORKDAY·REMOTE 8시간, HALF_OFF 4시간. 판정이 없는 유형은 null. */
export function requiredWorkSeconds(dayType: DayType): number | null {
  switch (dayType) {
    case DayType.WORKDAY:
    case DayType.REMOTE:
      return 8 * HOUR;
    case DayType.HALF_OFF:
      return 4 * HOUR;
    default:
      return null;
  }
}

/** 조퇴(비정상). 기준 근무시간 미만. 판정이 없는 유형은 null. */
export function isEarlyLeave(dayType: DayType, worked: number): boolean | null {
  const required = requiredWorkSeconds(dayType);
  return required === null ? null : worked < required;
}
