import { addDays, type DateStr } from '../common/date-time.js';

export const OFF_VALID_DAYS = 30;

/** OFF 지급 건 = 주말 근무 신청과 대조되고 퇴근이 기록된 출퇴근 행 */
export interface OffGrant {
  attendanceId: number;
  /** 지급일 = 근무일 */
  workDate: DateStr;
}

/** 출퇴근 행에서 지급 건을 고른다. request_id는 WEEKEND_WORK 대조에만 쓰인다(DESIGN.md 4-1). */
export function toOffGrants(
  rows: ReadonlyArray<{ id: number; workDate: DateStr; requestId: number | null; checkOutAt: Date | null }>,
): OffGrant[] {
  return rows
    .filter((r) => r.requestId !== null && r.checkOutAt !== null)
    .map((r) => ({ attendanceId: r.id, workDate: r.workDate }));
}

/** 마지막 사용 가능일 = 지급일 + 30일(당일 포함). 예: 11/14 → 12/14 */
export function offExpiry(grantDate: DateStr): DateStr {
  return addDays(grantDate, OFF_VALID_DAYS);
}

function usableOn(grant: OffGrant, date: DateStr): boolean {
  return grant.workDate <= date && date <= offExpiry(grant.workDate);
}

/**
 * 사용일에 유효하고 다른 유효 신청이 가리키지 않는 지급 건 중 가장 먼저 받은 것.
 * usedIds = PENDING·APPROVED 신청의 used_attendance_id. 없으면 null(제출 거절).
 */
export function selectOffGrant(
  useDate: DateStr,
  grants: readonly OffGrant[],
  usedIds: ReadonlySet<number>,
): number | null {
  const candidates = grants
    .filter((g) => !usedIds.has(g.attendanceId) && usableOn(g, useDate))
    .sort((a, b) => a.workDate.localeCompare(b.workDate) || a.attendanceId - b.attendanceId);
  return candidates[0]?.attendanceId ?? null;
}

/** 잔여 = 오늘 기준 만료되지 않았고 아무 유효 신청도 가리키지 않는 지급 건 수 */
export function offRemaining(
  today: DateStr,
  grants: readonly OffGrant[],
  usedIds: ReadonlySet<number>,
): number {
  return grants.filter((g) => !usedIds.has(g.attendanceId) && today <= offExpiry(g.workDate)).length;
}
