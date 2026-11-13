import { addDays, addMonthsClamped, type DateStr } from '../common/date-time.js';
import { RequestType } from '../database/enums.js';
import { accruedAnnualLeave, annualRemaining } from './annual-leave.js';
import { summarizeAttendance } from './attendance-summary.js';
import { classifyDay } from './day-type.js';
import { offRemaining, type OffGrant } from './off.js';
import { remoteUsage } from './remote.js';
import { DayType, type HolidaySet } from './types.js';

// 월별 정산 (FR-STL-01). 저장하지 않고 조회할 때 출퇴근 행과 승인된 신청으로 계산한다.

export interface SettlementAttendance {
  workDate: DateStr;
  checkInAt: Date;
  checkOutAt: Date | null;
  checkOutSource: 'BUTTON' | 'MANUAL' | null;
  /** 주말 근무 대조 신청. 있으면 그날 유형은 WEEKEND_WORK */
  requestId: number | null;
}

export interface SettlementInput {
  /** 'YYYY-MM' */
  month: string;
  today: DateStr;
  hiredAt: DateStr;
  /** 그 달의 공휴일 */
  holidays: HolidaySet;
  /** 그 달의 출퇴근 행 */
  attendances: readonly SettlementAttendance[];
  /** 그 달 대상일의 APPROVED 신청 */
  approved: ReadonlyArray<{ targetDate: DateStr; type: RequestType }>;
}

export interface SettlementDay {
  date: DateStr;
  dayType: DayType;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  manual: boolean;
  late: boolean | null;
  earlyLeave: boolean | null;
  workSeconds: number | null;
  /** 과거 날짜인데 퇴근 없음 */
  unrecorded: boolean;
  /** 출근해야 하는 날(근무일·재택·반일 OFF)이 지났는데 출근 기록 없음. 입사 전 날짜는 제외 */
  absent: boolean;
}

export interface SettlementSummary {
  attendanceDays: number;
  /** 퇴근이 기록된 행의 근무시간 합(주말 근무 포함) */
  totalWorkSeconds: number;
  late: number;
  earlyLeave: number;
  unrecorded: number;
  manual: number;
  absent: number;
  /** 그 달 대상일의 APPROVED 신청 수 */
  annual: number;
  remote: number;
  halfOff: number;
  weekendWorkDays: number;
  weekendWorkSeconds: number;
  /** 그 달 근무일의 OFF 지급 건(주말 근무 대조 + 퇴근 기록) */
  offGranted: number;
}

const MUST_ATTEND: ReadonlySet<DayType> = new Set([DayType.WORKDAY, DayType.REMOTE, DayType.HALF_OFF]);

export function monthDays(month: string): DateStr[] {
  const first = `${month}-01`;
  const next = addMonthsClamped(first, 1);
  const days: DateStr[] = [];
  for (let d = first; d < next; d = addDays(d, 1)) days.push(d);
  return days;
}

export function settleMonth(input: SettlementInput): { summary: SettlementSummary; days: SettlementDay[] } {
  const rowBy = new Map(input.attendances.map((a) => [a.workDate, a]));
  const approvedBy = new Map(input.approved.map((r) => [r.targetDate, r.type]));

  const days = monthDays(input.month).map((date): SettlementDay => {
    const row = rowBy.get(date) ?? null;
    const dayType = row?.requestId ? DayType.WEEKEND_WORK : classifyDay(date, input.holidays, approvedBy.get(date) ?? null);
    const past = date < input.today;
    if (!row) {
      return {
        date,
        dayType,
        checkInAt: null,
        checkOutAt: null,
        manual: false,
        late: null,
        earlyLeave: null,
        workSeconds: null,
        unrecorded: false,
        absent: past && date >= input.hiredAt && MUST_ATTEND.has(dayType),
      };
    }
    const s = summarizeAttendance(dayType, row.checkInAt, row.checkOutAt);
    return {
      date,
      dayType,
      checkInAt: row.checkInAt,
      checkOutAt: row.checkOutAt,
      manual: row.checkOutSource === 'MANUAL',
      late: s.late,
      earlyLeave: s.earlyLeave,
      workSeconds: s.workSeconds,
      unrecorded: row.checkOutAt === null && past,
      absent: false,
    };
  });

  const count = (pred: (d: SettlementDay) => boolean) => days.filter(pred).length;
  const sumSeconds = (pred: (d: SettlementDay) => boolean) =>
    days.filter(pred).reduce((acc, d) => acc + (d.workSeconds ?? 0), 0);
  const approvedCount = (type: RequestType) => input.approved.filter((r) => r.type === type).length;
  const weekend = (d: SettlementDay) => d.dayType === DayType.WEEKEND_WORK && d.checkInAt !== null;

  return {
    days,
    summary: {
      attendanceDays: count((d) => d.checkInAt !== null),
      totalWorkSeconds: sumSeconds(() => true),
      late: count((d) => d.late === true),
      earlyLeave: count((d) => d.earlyLeave === true),
      unrecorded: count((d) => d.unrecorded),
      manual: count((d) => d.manual),
      absent: count((d) => d.absent),
      annual: approvedCount(RequestType.ANNUAL),
      remote: approvedCount(RequestType.REMOTE),
      halfOff: approvedCount(RequestType.OFF),
      weekendWorkDays: count(weekend),
      weekendWorkSeconds: sumSeconds(weekend),
      offGranted: count((d) => weekend(d) && d.checkOutAt !== null),
    },
  };
}

// ── 기준일 잔여 ─────────────────────────────────────────

/** 정산 잔여의 기준일: 지난 달이면 그달 말일, 이번 달(과 미래 달)이면 오늘 */
export function balanceAsOf(month: string, today: DateStr): DateStr {
  const monthEnd = addDays(addMonthsClamped(`${month}-01`, 1), -1);
  return monthEnd < today ? monthEnd : today;
}

export interface BalanceAsOfInput {
  month: string;
  asOf: DateStr;
  hiredAt: DateStr;
  /** 현재 PENDING·APPROVED 신청. submittedOn = created_at의 한국 날짜 */
  activeRequests: ReadonlyArray<{
    type: RequestType;
    targetDate: DateStr;
    submittedOn: DateStr;
    usedAttendanceId: number | null;
  }>;
  offGrants: readonly OffGrant[];
}

export interface BalanceAsOf {
  asOf: DateStr;
  annual: number;
  /** 정산 달의 재택 잔여 */
  remote: number;
  off: number;
}

/**
 * 기준일 시점 잔여. 신청 테이블에는 현재 상태만 있으므로(취소 시각 없음, 이력은 읽지 않음)
 * "기준일까지 제출했고 지금도 유효한 신청"을 사용으로 센다.
 * 한계: 기준일 뒤에 취소·반려된 신청은 기준일에도 없었던 것처럼 보인다.
 */
export function balancesAsOf(input: BalanceAsOfInput): BalanceAsOf {
  const submitted = input.activeRequests.filter((r) => r.submittedOn <= input.asOf);
  const annualUsed = submitted.filter((r) => r.type === RequestType.ANNUAL).length;
  // 재택은 달 단위라 기준일과 무관하게 그 달 대상일의 유효 신청으로 센다.
  const remoteDates = input.activeRequests.filter((r) => r.type === RequestType.REMOTE).map((r) => r.targetDate);
  const offUsed = new Set(
    submitted
      .filter((r) => r.type === RequestType.OFF && r.usedAttendanceId !== null)
      .map((r) => r.usedAttendanceId as number),
  );
  const grantsByAsOf = input.offGrants.filter((g) => g.workDate <= input.asOf);

  return {
    asOf: input.asOf,
    annual: annualRemaining(accruedAnnualLeave(input.hiredAt, input.asOf), annualUsed),
    remote: remoteUsage(input.month, remoteDates).remaining,
    off: offRemaining(input.asOf, grantsByAsOf, offUsed),
  };
}
