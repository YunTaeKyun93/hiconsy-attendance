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
