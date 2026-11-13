import { addMonthsClamped, type DateStr } from '../common/date-time.js';

/**
 * 적립 개수(오늘) = 입사일 다음 달 같은 날부터 오늘까지 도래한 적립일 수 (DESIGN.md 5-2).
 * 해당 일이 없는 달은 말일. 적립일 0시(KST)부터 포함. 상한 없음.
 * 원천(특별 지급 등)을 추가할 수 있도록 분리한다.
 */
export function accruedAnnualLeave(hiredAt: DateStr, today: DateStr): number {
  let count = 0;
  while (addMonthsClamped(hiredAt, count + 1) <= today) count++;
  return count;
}

/** 잔여 = 적립 − (PENDING + APPROVED 연차 수) */
export function annualRemaining(accrued: number, activeCount: number): number {
  return accrued - activeCount;
}

/** 특별 연차 지급분 (DESIGN.md 14-3). 판정에 필요한 부분만. */
export interface AnnualGrantFact {
  days: number;
  /** 지급일 = granted_at의 한국 날짜 */
  grantDate: DateStr;
  /** 취소일 = canceled_at의 한국 날짜. 취소되지 않았으면 null */
  canceledOn: DateStr | null;
}

/**
 * 기준일 시점에 유효한 특별 연차 일수 합: 기준일까지 지급됐고, 기준일까지 취소되지 않은 것.
 * 취소 시각을 저장하므로 과거 기준일도 정확하다(기준일 뒤에 취소된 지급분은 그날엔 유효).
 */
export function grantedAnnualDays(grants: readonly AnnualGrantFact[], asOf: DateStr): number {
  return grants
    .filter((g) => g.grantDate <= asOf && (g.canceledOn === null || g.canceledOn > asOf))
    .reduce((sum, g) => sum + g.days, 0);
}

/**
 * 특별 연차 취소 판정: 취소 후에도 잔여가 음수가 되면 안 된다(이미 그 연차를 써버린 경우).
 * remainingNow는 이 지급분을 포함한 현재 잔여.
 */
export function judgeGrantCancel(
  remainingNow: number,
  days: number,
): { ok: true } | { ok: false; remainingNow: number; remainingAfter: number } {
  const remainingAfter = remainingNow - days;
  return remainingAfter >= 0 ? { ok: true } : { ok: false, remainingNow, remainingAfter };
}
