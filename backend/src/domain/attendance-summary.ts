import { isLate } from './attendance-rules.js';
import type { DayType } from './types.js';
import { isEarlyLeave, workSeconds } from './work-time.js';

/** 출퇴근 행에서 계산하는 값. 저장하지 않고 조회할 때마다 계산한다. */
export interface AttendanceSummary {
  /** 판정 없는 유형은 null */
  late: boolean | null;
  /** 퇴근 전이면 null */
  workSeconds: number | null;
  /** 퇴근 전이거나 판정 없는 유형이면 null */
  earlyLeave: boolean | null;
}

export function summarizeAttendance(
  dayType: DayType,
  checkInAt: Date,
  checkOutAt: Date | null,
): AttendanceSummary {
  const late = isLate(dayType, checkInAt);
  if (checkOutAt === null) return { late, workSeconds: null, earlyLeave: null };
  const worked = workSeconds(checkInAt, checkOutAt);
  return {
    late,
    workSeconds: worked,
    earlyLeave: isEarlyLeave(dayType, worked),
  };
}
