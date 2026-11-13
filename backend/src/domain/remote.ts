import { yearMonth, type DateStr } from '../common/date-time.js';

export const REMOTE_MONTHLY_LIMIT = 2;

/**
 * 재택 제출 조건 (DESIGN.md 5-3): 재택일이 속한 달의 (PENDING + APPROVED 재택 수) < 2.
 * activeRemoteDates는 해당 사용자의 PENDING·APPROVED 재택 신청 대상일들.
 */
export function canRequestRemote(targetDate: DateStr, activeRemoteDates: readonly DateStr[]): boolean {
  const month = yearMonth(targetDate);
  return activeRemoteDates.filter((d) => yearMonth(d) === month).length < REMOTE_MONTHLY_LIMIT;
}

/** 달(YYYY-MM)별 재택 사용·잔여. 잔여 조회용. */
export function remoteUsage(
  month: string,
  activeRemoteDates: readonly DateStr[],
): { month: string; used: number; remaining: number } {
  const used = activeRemoteDates.filter((d) => yearMonth(d) === month).length;
  return { month, used, remaining: Math.max(0, REMOTE_MONTHLY_LIMIT - used) };
}
