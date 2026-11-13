import { describe, expect, it } from 'vitest';
import { accruedAnnualLeave, annualRemaining } from './annual-leave.js';

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
