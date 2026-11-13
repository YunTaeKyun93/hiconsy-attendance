import type { DateStr } from '../common/date-time.js';
import { RequestType } from '../database/enums.js';
import { isBusinessDay } from './business-day.js';
import { DayType, type HolidaySet } from './types.js';

/**
 * 날짜 유형 (DESIGN.md 3장).
 * approvedType은 그날의 APPROVED 신청 유형. PENDING은 유형을 바꾸지 않으므로 넘기지 않는다.
 * 날짜와 맞지 않는 유형(예: 영업일의 WEEKEND_WORK)은 무시하고 기본 유형으로 본다.
 */
export function classifyDay(
  date: DateStr,
  holidays: HolidaySet,
  approvedType: RequestType | null,
): DayType {
  if (isBusinessDay(date, holidays)) {
    switch (approvedType) {
      case RequestType.REMOTE:
        return DayType.REMOTE;
      case RequestType.OFF:
        return DayType.HALF_OFF;
      case RequestType.ANNUAL:
        return DayType.ANNUAL;
      default:
        return DayType.WORKDAY;
    }
  }
  return approvedType === RequestType.WEEKEND_WORK ? DayType.WEEKEND_WORK : DayType.NON_WORKDAY;
}
