import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { isIP } from 'node:net';
import { In, QueryFailedError, type DataSource } from 'typeorm';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { CLOCK, type Clock } from '../clock/clock.js';
import {
  addDays,
  isValidDateStr,
  isValidTimeStr,
  timeToSeconds,
  toSeoulDate,
  type DateStr,
} from '../common/date-time.js';
import type { AuthUser } from '../common/request-context.js';
import { WorkRequest } from '../database/entities/request.entity.js';
import { User } from '../database/entities/user.entity.js';
import { RequestStatus, RequestType, UserRole } from '../database/enums.js';
import { canApprove, canCancel } from '../domain/business-day.js';
import { normalizeIp } from '../domain/ip-access.js';
import {
  judgeSubmission,
  type SubmissionRefusal,
} from '../domain/request-submission.js';
import { HolidaysService } from '../holidays/holidays.service.js';
import { loadBalanceFacts } from './balance-facts.js';
import {
  actionRefusal,
  submitRefusal,
  type RequestActionRefusal,
} from './requests-errors.js';

/** 직전 영업일을 찾을 때 거슬러 볼 공휴일 범위. 연휴+주말을 넉넉히 덮는다. */
const HOLIDAY_LOOKBACK_DAYS = 30;

type SubmitOutcome = { refused: SubmissionRefusal } | { saved: WorkRequest };

interface SubmitInput {
  type: RequestType;
  targetDate: DateStr;
  reason: string;
  allowedIp: string | null;
  startTime: string | null;
  endTime: string | null;
}

export interface RequestView {
  id: number;
  userId: number;
  userName: string;
  type: RequestType;
  targetDate: DateStr;
  status: RequestStatus;
  reason: string;
  allowedIp: string | null;
  startTime: string | null;
  endTime: string | null;
  /** OFF: 사용한 지급 건의 근무일 */
  offGrantWorkDate: DateStr | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  createdAt: string;
  /** 본인이 지금 취소할 수 있는지 */
  cancelable: boolean;
  /** 리드가 지금 승인할 수 있는지(대상일 0시 전 PENDING) */
  approvable: boolean;
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly holidays: HolidaysService,
    private readonly logs: ActivityLogService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // ── 제출 ──────────────────────────────────────────────

  async submit(
    actor: AuthUser,
    ip: string,
    body: unknown,
  ): Promise<RequestView> {
    const input = parseSubmitBody(body);
    const now = this.clock.now();
    const today = toSeoulDate(now);
    const holidays = await this.holidays.setBetween(
      addDays(input.targetDate, -HOLIDAY_LOOKBACK_DAYS),
      input.targetDate,
    );

    const outcome: SubmitOutcome = await this.dataSource
      .transaction(async (m): Promise<SubmitOutcome> => {
        // 같은 사용자의 제출을 줄 세운다. 잔여 검사와 저장 사이에 다른 제출이 끼지 못하게.
        const user = await m.findOneOrFail(User, {
          where: { id: actor.id },
          lock: { mode: 'pessimistic_write' },
        });
        const facts = await loadBalanceFacts(m, actor.id);

        const judged = judgeSubmission({
          type: input.type,
          targetDate: input.targetDate,
          now,
          today,
          holidays,
          hasActiveOnDate: facts.activeRequests.some(
            (r) => r.targetDate === input.targetDate,
          ),
          hiredAt: user.hiredAt,
          activeAnnualCount: facts.activeAnnualCount,
          activeRemoteDates: facts.activeRemoteDates,
          offGrants: facts.offGrants,
          offUsedIds: facts.offUsedIds,
        });
        if (!judged.ok) return { refused: judged };

        // 리드 본인의 신청은 제출 즉시 APPROVED (5-1)
        const isLead = actor.role === UserRole.LEAD;
        const saved = await m.save(
          m.create(WorkRequest, {
            userId: actor.id,
            type: input.type,
            targetDate: input.targetDate,
            status: isLead ? RequestStatus.APPROVED : RequestStatus.PENDING,
            reason: input.reason,
            allowedIp: input.allowedIp,
            startTime: input.startTime,
            endTime: input.endTime,
            usedAttendanceId: judged.usedAttendanceId,
            reviewedBy: isLead ? actor.id : null,
            reviewedAt: isLead ? now : null,
            createdAt: now,
          }),
        );
        return { saved };
      })
      .catch((e: unknown): SubmitOutcome => {
        // 잠금으로 막히지만, 부분 UNIQUE 인덱스가 마지막 방어선이다.
        if (isUniqueViolation(e))
          return { refused: { reason: 'DUPLICATE_DATE' } as SubmissionRefusal };
        throw e;
      });

    if ('refused' in outcome) {
      await this.logs.write(
        {
          action: 'REQUEST_SUBMIT_REFUSED',
          userId: actor.id,
          payload: {
            type: input.type,
            targetDate: input.targetDate,
            reason: outcome.refused.reason,
          },
        },
        { ip },
      );
      throw submitRefusal(outcome.refused, input.targetDate);
    }

    const { saved } = outcome;
    await this.logs.write(
      {
        action: 'REQUEST_SUBMITTED',
        userId: actor.id,
        payload: {
          type: saved.type,
          targetDate: saved.targetDate,
          status: saved.status,
          usedAttendanceId: saved.usedAttendanceId,
        },
      },
      { ip, targetType: 'request', targetId: saved.id },
    );
    return this.view(saved.id, now);
  }

  // ── 취소 (본인) ───────────────────────────────────────

  async cancel(actor: AuthUser, ip: string, id: number): Promise<RequestView> {
    const now = this.clock.now();
    const refuse = (reason: RequestActionRefusal) =>
      this.refuseAction(actor, ip, id, 'CANCEL', reason);

    const req = await this.dataSource
      .getRepository(WorkRequest)
      .findOne({ where: { id } });
    // 남의 신청은 존재 여부를 드러내지 않는다.
    if (!req || req.userId !== actor.id) throw await refuse('NOT_FOUND');
    if (
      req.status !== RequestStatus.PENDING &&
      req.status !== RequestStatus.APPROVED
    ) {
      throw await refuse('INVALID_STATUS');
    }
    if (!canCancel(now, req.targetDate))
      throw await refuse('CANCEL_DEADLINE_PASSED');

    const fromStatus = req.status;
    const result = await this.dataSource
      .getRepository(WorkRequest)
      .update(
        { id, status: In([RequestStatus.PENDING, RequestStatus.APPROVED]) },
        { status: RequestStatus.CANCELED },
      );
    if (!result.affected) throw await refuse('INVALID_STATUS');

    await this.logs.write(
      { action: 'REQUEST_CANCELED', userId: actor.id, payload: { fromStatus } },
      { ip, targetType: 'request', targetId: id },
    );
    return this.view(id, now);
  }

  // ── 승인·반려 (리드) ──────────────────────────────────

  async approve(actor: AuthUser, ip: string, id: number): Promise<RequestView> {
    return this.review(actor, ip, id, 'APPROVE');
  }

  async reject(actor: AuthUser, ip: string, id: number): Promise<RequestView> {
    return this.review(actor, ip, id, 'REJECT');
  }

  private async review(
    actor: AuthUser,
    ip: string,
    id: number,
    attempt: 'APPROVE' | 'REJECT',
  ) {
    const now = this.clock.now();
    const refuse = (reason: RequestActionRefusal) =>
      this.refuseAction(actor, ip, id, attempt, reason);
    const repo = this.dataSource.getRepository(WorkRequest);

    const req = await repo.findOne({ where: { id } });
    if (!req) throw await refuse('NOT_FOUND');
    if (req.status !== RequestStatus.PENDING)
      throw await refuse('INVALID_STATUS');
    // 승인은 대상일 0시 전까지만. 대상일이 지난 PENDING은 반려만 가능(5-1).
    if (attempt === 'APPROVE' && !canApprove(now, req.targetDate))
      throw await refuse('APPROVE_DEADLINE_PASSED');

    const status =
      attempt === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED;
    const result = await repo.update(
      { id, status: RequestStatus.PENDING },
      { status, reviewedBy: actor.id, reviewedAt: now },
    );
    if (!result.affected) throw await refuse('INVALID_STATUS');

    await this.logs.write(
      {
        action: attempt === 'APPROVE' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
        userId: actor.id,
        payload: { requesterId: req.userId },
      },
      { ip, targetType: 'request', targetId: id },
    );
    return this.view(id, now);
  }

  // ── 조회 ─────────────────────────────────────────────

  async mine(userId: number): Promise<RequestView[]> {
    const rows = await this.dataSource.getRepository(WorkRequest).find({
      where: { userId },
      relations: { user: true, usedAttendance: true },
      order: { targetDate: 'DESC', id: 'DESC' },
    });
    const now = this.clock.now();
    return rows.map((r) => toView(r, now));
  }

  /** 리드 승인 화면: 대기 중인 신청 전체(대상일 오름차순) */
  async pending(): Promise<RequestView[]> {
    const rows = await this.dataSource.getRepository(WorkRequest).find({
      where: { status: RequestStatus.PENDING },
      relations: { user: true, usedAttendance: true },
      order: { targetDate: 'ASC', id: 'ASC' },
    });
    const now = this.clock.now();
    return rows.map((r) => toView(r, now));
  }

  // ── 내부 ─────────────────────────────────────────────

  private async view(id: number, now: Date): Promise<RequestView> {
    const row = await this.dataSource
      .getRepository(WorkRequest)
      .findOneOrFail({
        where: { id },
        relations: { user: true, usedAttendance: true },
      });
    return toView(row, now);
  }

  private async refuseAction(
    actor: AuthUser,
    ip: string,
    id: number,
    attempt: 'CANCEL' | 'APPROVE' | 'REJECT',
    reason: RequestActionRefusal,
  ) {
    await this.logs.write(
      {
        action: 'REQUEST_ACTION_REFUSED',
        userId: actor.id,
        payload: { attempt, reason },
      },
      { ip, targetType: 'request', targetId: id },
    );
    return actionRefusal(reason);
  }
}

function toView(r: WorkRequest, now: Date): RequestView {
  const active =
    r.status === RequestStatus.PENDING || r.status === RequestStatus.APPROVED;
  return {
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    type: r.type,
    targetDate: r.targetDate,
    status: r.status,
    reason: r.reason,
    allowedIp: r.allowedIp,
    startTime: r.startTime,
    endTime: r.endTime,
    offGrantWorkDate: r.usedAttendance?.workDate ?? null,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    cancelable: active && canCancel(now, r.targetDate),
    approvable:
      r.status === RequestStatus.PENDING && canApprove(now, r.targetDate),
  };
}

const REASON_MAX = 500;

function badInput(message: string): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'INVALID_INPUT',
    message,
  });
}

function parseSubmitBody(body: unknown): SubmitInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const type = b.type;
  if (
    typeof type !== 'string' ||
    !(Object.values(RequestType) as string[]).includes(type)
  ) {
    throw badInput(
      'type은 ANNUAL, REMOTE, OFF, WEEKEND_WORK 중 하나여야 합니다.',
    );
  }
  if (typeof b.targetDate !== 'string' || !isValidDateStr(b.targetDate)) {
    throw badInput('targetDate(YYYY-MM-DD)를 입력하세요.');
  }
  const reason = typeof b.reason === 'string' ? b.reason.trim() : '';
  if (reason === '' || reason.length > REASON_MAX)
    throw badInput(`사유를 1~${REASON_MAX}자로 입력하세요.`);

  const input: SubmitInput = {
    type: type as RequestType,
    targetDate: b.targetDate,
    reason,
    allowedIp: null,
    startTime: null,
    endTime: null,
  };

  // REMOTE·WEEKEND_WORK만 IP와 시간대를 받는다. 다른 유형에서는 무시한다.
  if (type === RequestType.REMOTE || type === RequestType.WEEKEND_WORK) {
    const ip = typeof b.allowedIp === 'string' ? normalizeIp(b.allowedIp) : '';
    if (isIP(ip) === 0)
      throw badInput('allowedIp에 올바른 IP 주소를 입력하세요.');
    const { startTime, endTime } = b;
    if (
      typeof startTime !== 'string' ||
      typeof endTime !== 'string' ||
      !isValidTimeStr(startTime) ||
      !isValidTimeStr(endTime)
    ) {
      throw badInput('startTime, endTime(HH:MM:SS)을 입력하세요.');
    }
    if (timeToSeconds(startTime) >= timeToSeconds(endTime))
      throw badInput('시작 시각은 종료 시각보다 빨라야 합니다.');
    Object.assign(input, { allowedIp: ip, startTime, endTime });
  }
  return input;
}

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof QueryFailedError &&
    (e.driverError as { code?: string } | undefined)?.code === '23505'
  );
}
