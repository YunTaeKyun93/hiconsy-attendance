import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { CLOCK, type Clock } from '../clock/clock.js';
import { toSeoulDate } from '../common/date-time.js';
import type { AuthUser } from '../common/request-context.js';
import { AnnualGrant } from '../database/entities/annual-grant.entity.js';
import { User } from '../database/entities/user.entity.js';
import { AnnualGrantStatus } from '../database/enums.js';
import { accruedAnnualLeave, annualRemaining, grantedAnnualDays, judgeGrantCancel } from '../domain/annual-leave.js';
import { loadBalanceFacts } from '../requests/balance-facts.js';
import { grantRefusal, type GrantRefusalCode } from './annual-grants-errors.js';

const MIN_DAYS = 1;
const MAX_DAYS = 5;
const REASON_MAX = 500;

export interface AnnualGrantView {
  id: number;
  userId: number;
  userName: string;
  days: number;
  reason: string;
  status: AnnualGrantStatus;
  grantedByName: string;
  grantedAt: string;
  canceledByName: string | null;
  canceledAt: string | null;
}

type Outcome<T> = { ok: true; value: T } | { ok: false; code: GrantRefusalCode; extra?: Record<string, unknown> };

/** 리드의 특별 연차 지급·취소 (DESIGN.md 14-3) */
@Injectable()
export class AnnualGrantsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logs: ActivityLogService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(): Promise<AnnualGrantView[]> {
    const rows = await this.dataSource.getRepository(AnnualGrant).find({
      relations: { user: true, granter: true, canceler: true },
      order: { grantedAt: 'DESC', id: 'DESC' },
    });
    return rows.map(toView);
  }

  async grant(actor: AuthUser, ip: string, body: unknown): Promise<AnnualGrantView> {
    const input = parseGrantBody(body);
    const now = this.clock.now();

    const outcome = await this.dataSource.transaction(async (m): Promise<Outcome<AnnualGrant>> => {
      // 리드 본인 신청은 즉시 승인이라 확인할 사람이 없으므로 본인 지급은 막는다.
      if (input.userId === actor.id) return { ok: false, code: 'SELF_GRANT' };
      // 연차 신청 제출과 같은 잠금으로 줄 세운다.
      const user = await m.findOne(User, { where: { id: input.userId }, lock: { mode: 'pessimistic_write' } });
      if (!user) return { ok: false, code: 'USER_NOT_FOUND' };
      const saved = await m.save(
        m.create(AnnualGrant, {
          userId: user.id,
          days: input.days,
          reason: input.reason,
          status: AnnualGrantStatus.ACTIVE,
          grantedBy: actor.id,
          grantedAt: now,
          canceledBy: null,
          canceledAt: null,
        }),
      );
      return { ok: true, value: saved };
    });

    if (!outcome.ok) throw await this.refuse(actor, ip, 'GRANT', outcome.code, null, outcome.extra);
    await this.logs.write(
      { action: 'ANNUAL_GRANTED', userId: actor.id, payload: { recipientId: input.userId, days: input.days } },
      { ip, targetType: 'annual_grant', targetId: outcome.value.id },
    );
    return this.view(outcome.value.id);
  }

  async cancel(actor: AuthUser, ip: string, id: number): Promise<AnnualGrantView> {
    const now = this.clock.now();
    const today = toSeoulDate(now);

    const outcome = await this.dataSource.transaction(async (m): Promise<Outcome<AnnualGrant>> => {
      const grant = await m.findOne(AnnualGrant, { where: { id } });
      if (!grant) return { ok: false, code: 'NOT_FOUND' };
      // 받는 사람의 연차 신청 제출과 겹치지 않도록 같은 사용자 행을 잠근 뒤 다시 읽는다.
      const user = await m.findOneOrFail(User, { where: { id: grant.userId }, lock: { mode: 'pessimistic_write' } });
      const current = await m.findOneOrFail(AnnualGrant, { where: { id } });
      if (current.status === AnnualGrantStatus.CANCELED) return { ok: false, code: 'ALREADY_CANCELED' };

      const facts = await loadBalanceFacts(m, user.id);
      const remainingNow = annualRemaining(
        accruedAnnualLeave(user.hiredAt, today) + grantedAnnualDays(facts.annualGrants, today),
        facts.activeAnnualCount,
      );
      const judged = judgeGrantCancel(remainingNow, current.days);
      if (!judged.ok) {
        return {
          ok: false,
          code: 'NEGATIVE_BALANCE',
          extra: { remainingNow: judged.remainingNow, days: current.days, remainingAfter: judged.remainingAfter },
        };
      }

      current.status = AnnualGrantStatus.CANCELED;
      current.canceledBy = actor.id;
      current.canceledAt = now;
      await m.save(current);
      return { ok: true, value: current };
    });

    if (!outcome.ok) throw await this.refuse(actor, ip, 'CANCEL', outcome.code, id, outcome.extra);
    await this.logs.write(
      {
        action: 'ANNUAL_GRANT_CANCELED',
        userId: actor.id,
        payload: { recipientId: outcome.value.userId, days: outcome.value.days },
      },
      { ip, targetType: 'annual_grant', targetId: id },
    );
    return this.view(id);
  }

  private async view(id: number): Promise<AnnualGrantView> {
    const row = await this.dataSource.getRepository(AnnualGrant).findOneOrFail({
      where: { id },
      relations: { user: true, granter: true, canceler: true },
    });
    return toView(row);
  }

  private async refuse(
    actor: AuthUser,
    ip: string,
    attempt: 'GRANT' | 'CANCEL',
    code: GrantRefusalCode,
    targetId: number | null,
    extra?: Record<string, unknown>,
  ) {
    await this.logs.write(
      { action: 'ANNUAL_GRANT_ACTION_REFUSED', userId: actor.id, payload: { attempt, reason: code } },
      { ip, ...(targetId !== null ? { targetType: 'annual_grant', targetId } : {}) },
    );
    return grantRefusal(code, extra);
  }
}

function toView(g: AnnualGrant): AnnualGrantView {
  return {
    id: g.id,
    userId: g.userId,
    userName: g.user.name,
    days: g.days,
    reason: g.reason,
    status: g.status,
    grantedByName: g.granter.name,
    grantedAt: g.grantedAt.toISOString(),
    canceledByName: g.canceler?.name ?? null,
    canceledAt: g.canceledAt?.toISOString() ?? null,
  };
}

function parseGrantBody(body: unknown): { userId: number; days: number; reason: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const bad = (message: string) => new BadRequestException({ statusCode: 400, code: 'INVALID_INPUT', message });
  if (typeof b.userId !== 'number' || !Number.isInteger(b.userId)) throw bad('userId를 입력하세요.');
  if (typeof b.days !== 'number' || !Number.isInteger(b.days) || b.days < MIN_DAYS || b.days > MAX_DAYS) {
    throw bad(`지급 일수는 ${MIN_DAYS}~${MAX_DAYS}일의 정수여야 합니다.`);
  }
  const reason = typeof b.reason === 'string' ? b.reason.trim() : '';
  if (reason === '' || reason.length > REASON_MAX) throw bad(`사유를 1~${REASON_MAX}자로 입력하세요.`);
  return { userId: b.userId, days: b.days, reason };
}
