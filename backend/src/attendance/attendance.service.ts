import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, QueryFailedError, type Repository } from 'typeorm';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import type { AttendanceAttempt } from '../activity-log/activity-log.types.js';
import { CLOCK, type Clock } from '../clock/clock.js';
import {
  addDays,
  addMonthsClamped,
  isValidDateStr,
  isValidTimeStr,
  seoulToInstant,
  toSeoulDate,
  type DateStr,
} from '../common/date-time.js';
import { Attendance } from '../database/entities/attendance.entity.js';
import { User } from '../database/entities/user.entity.js';
import { WorkRequest } from '../database/entities/request.entity.js';
import { CheckOutSource, RequestStatus } from '../database/enums.js';
import {
  findUnrecordedDates,
  isInRange,
  judgeButtonCheckOut,
  judgeCheckIn,
  manualCheckOutRange,
  type AttendanceRejectReason,
  type InstantRange,
} from '../domain/attendance-rules.js';
import {
  presenceOf,
  summarizeAttendance,
  type AttendanceSummary,
  type Presence,
} from '../domain/attendance-summary.js';
import { classifyDay } from '../domain/day-type.js';
import { ipMatches } from '../domain/ip-access.js';
import { DayType, type TimeWindow } from '../domain/types.js';
import { HolidaysService } from '../holidays/holidays.service.js';
import { normalCheckOutFrom } from '../domain/normal-check-out.js';
import {
  attendanceRejection,
  type AttendanceRejectCode,
} from './attendance-errors.js';

/** 그날의 유형과, 주말 근무라면 대조한 신청 */
interface DayContext {
  dayType: DayType;
  /** WEEKEND_WORK일 때만 */
  weekendRequest: WorkRequest | null;
}

export interface AttendanceView extends AttendanceSummary {
  id: number;
  workDate: DateStr;
  dayType: DayType;
  checkInAt: string;
  checkOutAt: string | null;
  checkOutSource: CheckOutSource | null;
}

export interface UnrecordedView {
  workDate: DateStr;
  checkInAt: string;
  /** 직접 입력 허용 범위(양 끝 포함) */
  min: string;
  max: string;
}

export interface MyAttendanceView {
  today: DateStr;
  todayType: DayType;
  attendance: AttendanceView | null;
  /** 근무 중(출근, 퇴근 전)일 때 정상 퇴근 가능 시각. 판정이 없는 유형(주말 근무)이면 null */
  normalCheckOutFrom: string | null;
  unrecorded: UnrecordedView[];
}

export interface BoardRow {
  userId: number;
  name: string;
  dayType: DayType;
  presence: Presence;
  attendance: AttendanceView | null;
}

export interface BoardView {
  today: DateStr;
  rows: BoardRow[];
}

export interface IrregularRow extends AttendanceView {
  userId: number;
  name: string;
  /** 미기록(과거 날짜, 퇴근 없음) 또는 직접 입력 */
  kind: 'UNRECORDED' | 'MANUAL';
}

interface Actor {
  userId: number;
  /** 정규화된 요청 IP */
  ip: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendances: Repository<Attendance>,
    @InjectRepository(WorkRequest)
    private readonly requests: Repository<WorkRequest>,
    private readonly holidays: HolidaysService,
    private readonly logs: ActivityLogService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // ── 출근 ──────────────────────────────────────────────

  async checkIn(actor: Actor): Promise<AttendanceView> {
    const now = this.clock.now();
    const today = toSeoulDate(now);
    const reject = (
      code: AttendanceRejectCode,
      extra?: Record<string, unknown>,
    ) => this.reject(actor, 'CHECK_IN', today, code, extra);

    // 4-3: 미기록 퇴근이 있으면 서버가 출근을 거부한다.
    const open = await this.attendances.find({
      where: { userId: actor.userId, checkOutAt: IsNull() },
    });
    const unrecorded = findUnrecordedDates(open, today);
    if (unrecorded.length > 0)
      throw await reject('UNRECORDED_CHECKOUT', { dates: unrecorded });

    if (
      await this.attendances.exists({
        where: { userId: actor.userId, workDate: today },
      })
    ) {
      throw await reject('ALREADY_CHECKED_IN');
    }

    const day = await this.dayContext(actor.userId, today);
    const judged = judgeCheckIn(day.dayType, now, windowOf(day.weekendRequest));
    if (!judged.ok) throw await reject(rejectCode(judged.reason));
    if (
      day.weekendRequest &&
      !ipMatches(day.weekendRequest.allowedIp, actor.ip)
    ) {
      throw await reject('IP_MISMATCH');
    }

    let saved: Attendance;
    try {
      saved = await this.attendances.save(
        this.attendances.create({
          userId: actor.userId,
          workDate: today,
          checkInAt: now,
          checkOutAt: null,
          checkOutSource: null,
          requestId: day.weekendRequest?.id ?? null,
        }),
      );
    } catch (e) {
      // 동시에 두 번 누른 경우 (user_id, work_date) UNIQUE에 걸린다.
      if (isUniqueViolation(e)) throw await reject('ALREADY_CHECKED_IN');
      throw e;
    }

    await this.logs.write(
      {
        action: 'CHECK_IN',
        userId: actor.userId,
        payload: { workDate: today, checkInAt: now.toISOString() },
      },
      { ip: actor.ip, targetType: 'attendance', targetId: saved.id },
    );
    return toView(saved, day.dayType);
  }

  // ── 퇴근 버튼 ─────────────────────────────────────────

  async checkOut(actor: Actor): Promise<AttendanceView> {
    const now = this.clock.now();
    const today = toSeoulDate(now);
    const reject = (code: AttendanceRejectCode) =>
      this.reject(actor, 'CHECK_OUT', today, code);

    const row = await this.attendances.findOne({
      where: { userId: actor.userId, workDate: today },
    });
    if (!row) throw await reject('NOT_CHECKED_IN');
    if (row.checkOutAt) throw await reject('ALREADY_CHECKED_OUT');

    const day = await this.dayContextOfRow(row);
    const judged = judgeButtonCheckOut(
      day.dayType,
      now,
      windowOf(day.weekendRequest),
    );
    if (!judged.ok) throw await reject(rejectCode(judged.reason));
    if (
      day.weekendRequest &&
      !ipMatches(day.weekendRequest.allowedIp, actor.ip)
    ) {
      throw await reject('IP_MISMATCH');
    }

    if (!(await this.recordCheckOut(row, now, CheckOutSource.BUTTON)))
      throw await reject('ALREADY_CHECKED_OUT');

    await this.logs.write(
      {
        action: 'CHECK_OUT',
        userId: actor.userId,
        payload: { workDate: today, checkOutAt: now.toISOString() },
      },
      { ip: actor.ip, targetType: 'attendance', targetId: row.id },
    );
    return toView(row, day.dayType);
  }

  // ── 미기록 퇴근 직접 입력 ─────────────────────────────

  async manualCheckOut(actor: Actor, body: unknown): Promise<AttendanceView> {
    const { workDate, checkOutTime } = parseManualBody(body);
    const today = toSeoulDate(this.clock.now());
    const reject = (
      code: AttendanceRejectCode,
      extra?: Record<string, unknown>,
    ) => this.reject(actor, 'MANUAL_CHECK_OUT', workDate, code, extra);

    // 오늘 기록은 버튼으로. 자정이 지나야 미기록이 된다(4-3).
    if (workDate >= today) throw await reject('NOT_PAST');

    const row = await this.attendances.findOne({
      where: { userId: actor.userId, workDate },
    });
    if (!row) throw await reject('NOT_FOUND');
    if (row.checkOutAt) throw await reject('ALREADY_CHECKED_OUT');

    // 주말 근무도 직접 입력은 allowed_ip를 대조하지 않는다(범위만 검사).
    const day = await this.dayContextOfRow(row);
    const range = manualRange(row, day);
    const value = seoulToInstant(workDate, checkOutTime);
    if (!isInRange(value, range))
      throw await reject('OUT_OF_RANGE', rangeJson(range));

    if (!(await this.recordCheckOut(row, value, CheckOutSource.MANUAL)))
      throw await reject('ALREADY_CHECKED_OUT');

    await this.logs.write(
      {
        action: 'MANUAL_CHECK_OUT',
        userId: actor.userId,
        payload: { workDate, checkOutAt: value.toISOString() },
      },
      { ip: actor.ip, targetType: 'attendance', targetId: row.id },
    );
    return toView(row, day.dayType);
  }

  // ── 내 출퇴근 조회 ────────────────────────────────────

  async mine(userId: number): Promise<MyAttendanceView> {
    const today = toSeoulDate(this.clock.now());
    const todayContext = await this.dayContext(userId, today);
    const row = await this.attendances.findOne({
      where: { userId, workDate: today },
    });

    const open = await this.attendances.find({
      where: { userId, checkOutAt: IsNull() },
      order: { workDate: 'ASC' },
    });
    const pastOpen = open.filter((r) => r.workDate < today);
    const unrecorded: UnrecordedView[] = [];
    for (const r of pastOpen) {
      const range = manualRange(r, await this.dayContextOfRow(r));
      unrecorded.push({
        workDate: r.workDate,
        checkInAt: r.checkInAt.toISOString(),
        ...rangeJson(range),
      });
    }

    const rowType = row ? (await this.dayContextOfRow(row)).dayType : null;
    const working = row !== null && rowType !== null && row.checkOutAt === null;
    return {
      today,
      todayType: todayContext.dayType,
      attendance: row && rowType ? toView(row, rowType) : null,
      normalCheckOutFrom: working
        ? (normalCheckOutFrom(rowType, row.checkInAt)?.toISOString() ?? null)
        : null,
      unrecorded,
    };
  }

  // ── 리드: 팀 보드 ────────────────────────────────────

  /** 오늘 사용자별 날짜 유형과 출근 상태. PENDING 신청은 유형을 바꾸지 않는다. */
  async board(): Promise<BoardView> {
    const today = toSeoulDate(this.clock.now());
    const [users, holidays, approved, rows] = await Promise.all([
      this.attendances.manager.find(User, { order: { id: 'ASC' } }),
      this.holidays.setFor([today]),
      this.requests.find({ where: { targetDate: today, status: RequestStatus.APPROVED } }),
      this.attendances.find({ where: { workDate: today } }),
    ]);
    const approvedBy = new Map(approved.map((r) => [r.userId, r.type]));
    const rowBy = new Map(rows.map((r) => [r.userId, r]));

    return {
      today,
      rows: users.map((u) => {
        const row = rowBy.get(u.id) ?? null;
        // 주말 근무 행은 출근 때 대조한 신청이 있으므로 유형이 WEEKEND_WORK다.
        const dayType = row?.requestId
          ? DayType.WEEKEND_WORK
          : classifyDay(today, holidays, approvedBy.get(u.id) ?? null);
        return {
          userId: u.id,
          name: u.name,
          dayType,
          presence: presenceOf(dayType, row),
          attendance: row ? toView(row, dayType) : null,
        };
      }),
    };
  }

  // ── 리드: 미기록·직접 입력 목록 ───────────────────────

  /** month(YYYY-MM)의 미기록 행과 직접 입력 행. 최근 날짜 먼저. */
  async irregular(month: string): Promise<IrregularRow[]> {
    const today = toSeoulDate(this.clock.now());
    const from = `${month}-01`;
    const to = addDays(addMonthsClamped(from, 1), -1);

    const rows = await this.attendances.find({
      where: [
        { workDate: Between(from, to), checkOutAt: IsNull() },
        { workDate: Between(from, to), checkOutSource: CheckOutSource.MANUAL },
      ],
      relations: { user: true },
      order: { workDate: 'DESC', userId: 'ASC' },
    });
    // 오늘 퇴근 전인 행은 아직 미기록이 아니다.
    const irregular = rows.filter((r) => r.checkOutAt !== null || r.workDate < today);
    if (irregular.length === 0) return [];

    const [holidays, approved] = await Promise.all([
      this.holidays.setBetween(from, to),
      this.requests.find({
        where: {
          userId: In([...new Set(irregular.map((r) => r.userId))]),
          targetDate: Between(from, to),
          status: RequestStatus.APPROVED,
        },
      }),
    ]);
    const approvedBy = new Map(approved.map((r) => [`${r.userId}|${r.targetDate}`, r.type]));

    return irregular.map((r) => {
      const dayType = r.requestId
        ? DayType.WEEKEND_WORK
        : classifyDay(r.workDate, holidays, approvedBy.get(`${r.userId}|${r.workDate}`) ?? null);
      return {
        ...toView(r, dayType),
        userId: r.userId,
        name: r.user.name,
        kind: r.checkOutAt === null ? ('UNRECORDED' as const) : ('MANUAL' as const),
      };
    });
  }

  // ── 내부 ─────────────────────────────────────────────

  /** 날짜 유형(3장). APPROVED 신청만 반영한다. */
  private async dayContext(userId: number, date: DateStr): Promise<DayContext> {
    const [holidays, approved] = await Promise.all([
      this.holidays.setFor([date]),
      this.requests.findOne({
        where: { userId, targetDate: date, status: RequestStatus.APPROVED },
      }),
    ]);
    const dayType = classifyDay(date, holidays, approved?.type ?? null);
    return {
      dayType,
      weekendRequest: dayType === DayType.WEEKEND_WORK ? approved : null,
    };
  }

  /** 이미 있는 출퇴근 행의 유형. 주말 근무 행은 출근 때 대조한 신청을 그대로 쓴다. */
  private async dayContextOfRow(row: Attendance): Promise<DayContext> {
    if (row.requestId === null)
      return this.dayContext(row.userId, row.workDate);
    const request = await this.requests.findOneOrFail({
      where: { id: row.requestId },
    });
    return { dayType: DayType.WEEKEND_WORK, weekendRequest: request };
  }

  /** 아직 비어 있을 때만 퇴근을 기록한다. 동시 요청이면 하나만 성공. */
  private async recordCheckOut(
    row: Attendance,
    at: Date,
    source: CheckOutSource,
  ): Promise<boolean> {
    const result = await this.attendances.update(
      { id: row.id, checkOutAt: IsNull() },
      { checkOutAt: at, checkOutSource: source },
    );
    if (!result.affected) return false;
    row.checkOutAt = at;
    row.checkOutSource = source;
    return true;
  }

  /** 거절을 이력에 남기고 응답용 예외를 돌려준다. */
  private async reject(
    actor: Actor,
    attempt: AttendanceAttempt,
    workDate: DateStr,
    code: AttendanceRejectCode,
    extra?: Record<string, unknown>,
  ) {
    await this.logs.write(
      {
        action: 'ATTENDANCE_REJECTED',
        userId: actor.userId,
        payload: { attempt, reason: code, workDate },
      },
      { ip: actor.ip },
    );
    return attendanceRejection(code, extra);
  }
}

function windowOf(request: WorkRequest | null): TimeWindow | undefined {
  if (!request || request.startTime === null || request.endTime === null)
    return undefined;
  return { start: request.startTime, end: request.endTime };
}

/** MISSING_WINDOW는 시간대 없는 승인 신청(데이터 오류)이라 사용자 거절이 아니다. */
function rejectCode(reason: AttendanceRejectReason): AttendanceRejectCode {
  if (reason === 'MISSING_WINDOW')
    throw new Error('승인된 주말 근무 신청에 시간대가 없습니다.');
  return reason;
}

function manualRange(row: Attendance, day: DayContext): InstantRange {
  return manualCheckOutRange(
    day.dayType,
    row.workDate,
    row.checkInAt,
    windowOf(day.weekendRequest),
  );
}

function rangeJson(range: InstantRange): { min: string; max: string } {
  return { min: range.min.toISOString(), max: range.max.toISOString() };
}

function toView(row: Attendance, dayType: DayType): AttendanceView {
  return {
    id: row.id,
    workDate: row.workDate,
    dayType,
    checkInAt: row.checkInAt.toISOString(),
    checkOutAt: row.checkOutAt?.toISOString() ?? null,
    checkOutSource: row.checkOutSource,
    ...summarizeAttendance(dayType, row.checkInAt, row.checkOutAt),
  };
}

function parseManualBody(body: unknown): {
  workDate: DateStr;
  checkOutTime: string;
} {
  const { workDate, checkOutTime } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof workDate !== 'string' ||
    typeof checkOutTime !== 'string' ||
    !isValidDateStr(workDate) ||
    !isValidTimeStr(checkOutTime)
  ) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'INVALID_INPUT',
      message: 'workDate(YYYY-MM-DD)와 checkOutTime(HH:MM:SS)을 입력하세요.',
    });
  }
  return { workDate, checkOutTime };
}

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof QueryFailedError &&
    (e.driverError as { code?: string } | undefined)?.code === '23505'
  );
}
