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

/** 사용일 기준 지급 건 상태 */
export type OffGrantStatus = 'USABLE' | 'EXPIRED' | 'NOT_YET' | 'IN_USE';

export interface OffGrantOnDate {
  attendanceId: number;
  workDate: DateStr;
  /** 마지막 사용 가능일 */
  expiresOn: DateStr;
  status: OffGrantStatus;
}

/** 사용일(또는 오늘) 기준으로 각 지급 건의 상태. 지급일 순. */
export function offGrantsOn(
  date: DateStr,
  grants: readonly OffGrant[],
  usedIds: ReadonlySet<number>,
): OffGrantOnDate[] {
  return [...grants]
    .sort((a, b) => a.workDate.localeCompare(b.workDate) || a.attendanceId - b.attendanceId)
    .map((g) => {
      const expiresOn = offExpiry(g.workDate);
      const status: OffGrantStatus = usedIds.has(g.attendanceId)
        ? 'IN_USE'
        : date < g.workDate
          ? 'NOT_YET'
          : date > expiresOn
            ? 'EXPIRED'
            : 'USABLE';
      return { attendanceId: g.attendanceId, workDate: g.workDate, expiresOn, status };
    });
}

/** OFF 제출 거절 메시지. 지급 건마다 사용일 기준으로 왜 못 쓰는지 한 줄씩. */
export function offUnavailableMessage(useDate: DateStr, items: readonly OffGrantOnDate[]): string {
  if (items.length === 0) return '보유한 OFF가 없습니다.';
  const lines = items.map((g) => {
    switch (g.status) {
      case 'EXPIRED':
        return `- ${g.workDate} 근무분: ${g.expiresOn}까지 사용 가능 (만료)`;
      case 'NOT_YET':
        return `- ${g.workDate} 근무분: ${g.workDate}부터 사용 가능`;
      case 'IN_USE':
        return `- ${g.workDate} 근무분: 다른 신청에 사용 중`;
      case 'USABLE':
        return `- ${g.workDate} 근무분: ${g.expiresOn}까지 사용 가능`;
    }
  });
  return [`${useDate}에 쓸 수 있는 OFF가 없습니다.`, ...lines].join('\n');
}
