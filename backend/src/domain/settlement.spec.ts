import { seoulToInstant } from '../common/date-time.js';
import { RequestType } from '../database/enums.js';
import {
  balanceAsOf,
  balancesAsOf,
  monthDays,
  settleMonth,
  type SettlementAttendance,
  type SettlementInput,
} from './settlement.js';
import { DayType } from './types.js';

const row = (date: string, inT: string, outT: string | null, over: Partial<SettlementAttendance> = {}) => ({
  workDate: date,
  checkInAt: seoulToInstant(date, inT),
  checkOutAt: outT ? seoulToInstant(date, outT) : null,
  checkOutSource: outT ? ('BUTTON' as const) : null,
  requestId: null,
  ...over,
});

/** 2026-11: 1일(일), 2일(월) … 30일(월). 오늘 11-06(금). */
const base = (over: Partial<SettlementInput> = {}): SettlementInput => ({
  month: '2026-11',
  today: '2026-11-06',
  hiredAt: '2026-01-01',
  holidays: new Set(),
  attendances: [],
  approved: [],
  ...over,
});

describe('monthDays', () => {
  it('달의 모든 날짜', () => {
    expect(monthDays('2026-11')).toHaveLength(30);
    expect(monthDays('2028-02')).toHaveLength(29);
    expect(monthDays('2026-12').at(-1)).toBe('2026-12-31');
  });
});

describe('settleMonth', () => {
  const input = base({
    attendances: [
      row('2026-11-01', '13:00:00', '17:00:00', { requestId: 9 }), // 일요일 주말 근무 4시간 → OFF 지급
      row('2026-11-02', '09:00:00', '18:00:00'), // 정상 8시간
      row('2026-11-03', '10:00:01', '19:00:01'), // 지각, 정확히 8시간 → 조퇴 아님
      row('2026-11-04', '09:00:00', '15:00:00', { checkOutSource: 'MANUAL' }), // 직접 입력, 5시간 → 조퇴
      // 11-05 결근(기록 없음)
      row('2026-11-06', '09:00:00', null), // 오늘 퇴근 전 → 미기록 아님
    ],
    approved: [
      { targetDate: '2026-11-10', type: RequestType.ANNUAL },
      { targetDate: '2026-11-11', type: RequestType.REMOTE },
      { targetDate: '2026-11-12', type: RequestType.OFF },
    ],
  });
  const { summary, days } = settleMonth(input);

  it('요약', () => {
    expect(summary).toEqual({
      attendanceDays: 5,
      totalWorkSeconds: (4 + 8 + 8 + 5) * 3600,
      late: 1,
      earlyLeave: 1,
      unrecorded: 0,
      manual: 1,
      absent: 1,
      annual: 1,
      remote: 1,
      halfOff: 1,
      weekendWorkDays: 1,
      weekendWorkSeconds: 4 * 3600,
      offGranted: 1,
    });
  });

  it('일별 유형: 주말 근무 행, 승인된 신청, 휴무', () => {
    const type = (d: string) => days.find((x) => x.date === d)?.dayType;
    expect(type('2026-11-01')).toBe(DayType.WEEKEND_WORK);
    expect(type('2026-11-07')).toBe(DayType.NON_WORKDAY);
    expect(type('2026-11-10')).toBe(DayType.ANNUAL);
    expect(type('2026-11-12')).toBe(DayType.HALF_OFF);
  });

  it('지난 날의 퇴근 없음은 미기록', () => {
    const s = settleMonth(base({ today: '2026-11-07', attendances: [row('2026-11-06', '09:00:00', null)] })).summary;
    expect(s.unrecorded).toBe(1);
    expect(s.attendanceDays).toBe(1);
    expect(s.totalWorkSeconds).toBe(0);
  });

  it('결근: 근무일·재택·반일 OFF만, 연차·휴무·미래·입사 전은 제외', () => {
    const s = settleMonth(
      base({
        month: '2026-02',
        today: '2026-02-20',
        hiredAt: '2026-02-12',
        approved: [
          { targetDate: '2026-02-13', type: RequestType.ANNUAL },
          { targetDate: '2026-02-16', type: RequestType.REMOTE },
          { targetDate: '2026-02-17', type: RequestType.OFF },
        ],
      }),
    ).summary;
    // 2/12(목) 결근, 2/13(금) 연차, 2/16(월) 재택 결근, 2/17(화) 반일 OFF 결근, 2/18(수)·2/19(목) 결근
    expect(s.absent).toBe(5);
  });

  it('공휴일은 결근이 아니다', () => {
    const s = settleMonth(base({ today: '2026-11-04', holidays: new Set(['2026-11-02', '2026-11-03']) })).summary;
    expect(s.absent).toBe(0);
  });
});

describe('balanceAsOf', () => {
  it('지난 달은 말일, 이번 달·미래 달은 오늘', () => {
    expect(balanceAsOf('2026-10', '2026-11-13')).toBe('2026-10-31');
    expect(balanceAsOf('2026-11', '2026-11-13')).toBe('2026-11-13');
    expect(balanceAsOf('2026-12', '2026-11-13')).toBe('2026-11-13');
    expect(balanceAsOf('2026-11', '2026-11-30')).toBe('2026-11-30');
  });
});

describe('balancesAsOf', () => {
  // 임자율(02-12 입사): 10-31 기준 적립 8 (03-12 … 10-12)
  const req = (type: RequestType, targetDate: string, submittedOn: string, usedAttendanceId: number | null = null) => ({
    type,
    targetDate,
    submittedOn,
    usedAttendanceId,
  });

  it('연차: 기준일까지 제출한 유효 신청만 사용으로 센다', () => {
    const b = balancesAsOf({
      month: '2026-10',
      asOf: '2026-10-31',
      hiredAt: '2026-02-12',
      activeRequests: [
        req(RequestType.ANNUAL, '2026-10-05', '2026-10-01'),
        req(RequestType.ANNUAL, '2026-11-20', '2026-10-30'), // 미래 날짜라도 기준일 전에 냈으면 사용
        req(RequestType.ANNUAL, '2026-11-25', '2026-11-03'), // 기준일 뒤에 냄 → 안 셈
      ],
      offGrants: [],
    });
    expect(b).toEqual({ asOf: '2026-10-31', annual: 6, remote: 2, off: 0 });
  });

  it('재택: 정산 달 대상일 기준(제출 시점 무관)', () => {
    const b = balancesAsOf({
      month: '2026-11',
      asOf: '2026-11-13',
      hiredAt: '2026-01-01',
      activeRequests: [req(RequestType.REMOTE, '2026-11-03', '2026-10-30'), req(RequestType.REMOTE, '2026-12-01', '2026-11-10')],
      offGrants: [],
    });
    expect(b.remote).toBe(1);
  });

  it('OFF: 기준일까지 지급, 기준일에 만료 안 됨, 기준일까지 낸 유효 OFF가 쓰지 않은 건', () => {
    const grants = [
      { attendanceId: 1, workDate: '2026-09-20' }, // 10-20 만료 → 10-31 기준 만료
      { attendanceId: 2, workDate: '2026-10-10' }, // 사용 가능
      { attendanceId: 3, workDate: '2026-10-25' }, // 11월에 낸 OFF가 사용 → 10-31 기준으론 남아 있음
      { attendanceId: 4, workDate: '2026-11-01' }, // 기준일 뒤 지급
    ];
    const b = balancesAsOf({
      month: '2026-10',
      asOf: '2026-10-31',
      hiredAt: '2026-01-01',
      activeRequests: [req(RequestType.OFF, '2026-11-20', '2026-11-05', 3)],
      offGrants: grants,
    });
    expect(b.off).toBe(2);
  });
});
