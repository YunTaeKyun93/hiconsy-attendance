import { describe, expect, it } from 'vitest';
import { accruedAnnualLeave, annualRemaining, grantedAnnualDays, judgeGrantCancel } from './annual-leave.js';

describe('accruedAnnualLeave (DESIGN.md 5-2 예시 표)', () => {
  it.each([
    ['임자율', '2026-02-12', '2026-03-11', 0],
    ['임자율', '2026-02-12', '2026-03-12', 1],
    ['임자율', '2026-02-12', '2026-11-11', 8],
    ['임자율', '2026-02-12', '2026-11-12', 9],
    ['김근태', '2026-01-01', '2026-01-31', 0],
    ['김근태', '2026-01-01', '2026-02-01', 1],
  ])('%s(입사 %s) 오늘 %s → %i', (_name, hiredAt, today, expected) => {
    expect(accruedAnnualLeave(hiredAt, today)).toBe(expected);
  });

  it('입사일이 31일이면 짧은 달은 말일에 적립', () => {
    expect(accruedAnnualLeave('2026-01-31', '2026-02-27')).toBe(0);
    expect(accruedAnnualLeave('2026-01-31', '2026-02-28')).toBe(1);
    expect(accruedAnnualLeave('2026-01-31', '2026-03-30')).toBe(1);
    expect(accruedAnnualLeave('2026-01-31', '2026-03-31')).toBe(2);
  });

  it('입사 전이나 입사일에는 0', () => {
    expect(accruedAnnualLeave('2026-02-12', '2026-02-12')).toBe(0);
    expect(accruedAnnualLeave('2026-02-12', '2026-01-01')).toBe(0);
  });

  it('연도 경계', () => {
    expect(accruedAnnualLeave('2026-02-12', '2027-01-12')).toBe(11);
  });
});

describe('annualRemaining', () => {
  it('적립 − (PENDING + APPROVED)', () => {
    expect(annualRemaining(9, 3)).toBe(6);
    expect(annualRemaining(1, 1)).toBe(0);
  });
});

describe('grantedAnnualDays (특별 연차)', () => {
  const grants = [
    { days: 2, grantDate: '2026-11-10', canceledOn: null },
    { days: 3, grantDate: '2026-11-20', canceledOn: null }, // 기준일 뒤 지급
    { days: 5, grantDate: '2026-11-01', canceledOn: '2026-11-05' }, // 11-05에 취소
  ];
  it('기준일까지 지급되고 기준일까지 취소되지 않은 것만 더한다', () => {
    expect(grantedAnnualDays(grants, '2026-11-13')).toBe(2);
    expect(grantedAnnualDays(grants, '2026-11-20')).toBe(5);
    expect(grantedAnnualDays(grants, '2026-11-09')).toBe(0);
  });
  it('기준일 뒤에 취소된 지급분은 그 기준일에는 유효, 취소 당일부터 빠진다', () => {
    expect(grantedAnnualDays(grants, '2026-11-04')).toBe(5);
    expect(grantedAnnualDays(grants, '2026-11-05')).toBe(0);
  });
});

describe('judgeGrantCancel', () => {
  it('취소 후 잔여가 0 이상이면 허용', () => {
    expect(judgeGrantCancel(3, 3)).toEqual({ ok: true });
  });
  it('음수가 되면 거절하고 현재·취소 후 잔여를 알려준다', () => {
    expect(judgeGrantCancel(2, 3)).toEqual({ ok: false, remainingNow: 2, remainingAfter: -1 });
  });
});
