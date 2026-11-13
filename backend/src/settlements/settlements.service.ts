import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, In, IsNull, Not, type DataSource } from 'typeorm';
import { CLOCK, type Clock } from '../clock/clock.js';
import { addDays, addMonthsClamped, toSeoulDate } from '../common/date-time.js';
import { AnnualGrant } from '../database/entities/annual-grant.entity.js';
import { Attendance } from '../database/entities/attendance.entity.js';
import { WorkRequest } from '../database/entities/request.entity.js';
import { User } from '../database/entities/user.entity.js';
import { RequestStatus } from '../database/enums.js';
import { toOffGrants } from '../domain/off.js';
import {
  balanceAsOf,
  balancesAsOf,
  settleMonth,
  type BalanceAsOf,
  type SettlementDay,
  type SettlementSummary,
} from '../domain/settlement.js';
import { HolidaysService } from '../holidays/holidays.service.js';
import { toAnnualGrantFacts } from '../requests/balance-facts.js';

export interface SettlementRow {
  userId: number;
  name: string;
  summary: SettlementSummary;
  /** 기준일(지난 달=말일, 이번 달=오늘) 시점 잔여 */
  balance: BalanceAsOf;
}

export interface SettlementListView {
  month: string;
  today: string;
  rows: SettlementRow[];
}

export interface SettlementDayView extends Omit<SettlementDay, 'checkInAt' | 'checkOutAt'> {
  checkInAt: string | null;
  checkOutAt: string | null;
}

export interface SettlementDetailView extends SettlementRow {
  month: string;
  today: string;
  days: SettlementDayView[];
}

/** 월별 정산 (FR-STL-01). 저장하지 않고 조회할 때 계산한다. */
@Injectable()
export class SettlementsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly holidays: HolidaysService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  thisMonth(): string {
    return toSeoulDate(this.clock.now()).slice(0, 7);
  }

  /** 리드: 전원 요약 */
  async list(month: string): Promise<SettlementListView> {
    const users = await this.dataSource.manager.find(User, { order: { id: 'ASC' } });
    const ctx = await this.load(month);
    return {
      month,
      today: ctx.today,
      rows: users.map((u) => ({
        userId: u.id,
        name: u.name,
        summary: this.settle(u, month, ctx).summary,
        balance: this.balance(u, month, ctx),
      })),
    };
  }

  /** 한 사람의 요약과 일별 상세 */
  async detail(userId: number, month: string): Promise<SettlementDetailView> {
    const user = await this.dataSource.manager.findOne(User, { where: { id: userId } });
    if (!user) throw new NotFoundException({ statusCode: 404, code: 'USER_NOT_FOUND', message: '사용자가 없습니다.' });
    const ctx = await this.load(month, userId);
    const { summary, days } = this.settle(user, month, ctx);
    return {
      month,
      today: ctx.today,
      userId: user.id,
      name: user.name,
      summary,
      balance: this.balance(user, month, ctx),
      days: days.map((d) => ({
        ...d,
        checkInAt: d.checkInAt?.toISOString() ?? null,
        checkOutAt: d.checkOutAt?.toISOString() ?? null,
      })),
    };
  }

  private async load(month: string, userId?: number) {
    const from = `${month}-01`;
    const to = addDays(addMonthsClamped(from, 1), -1);
    const m = this.dataSource.manager;
    const who = userId ? { userId } : {};
    const [holidays, attendances, approved, active, grantRows, annualGrantRows] = await Promise.all([
      this.holidays.setBetween(from, to),
      m.find(Attendance, { where: { workDate: Between(from, to), ...who } }),
      m.find(WorkRequest, { where: { targetDate: Between(from, to), status: RequestStatus.APPROVED, ...who } }),
      // 잔여용: 날짜와 무관한 현재 유효 신청과 OFF 지급 건 전체
      m.find(WorkRequest, { where: { status: In([RequestStatus.PENDING, RequestStatus.APPROVED]), ...who } }),
      m.find(Attendance, { where: { requestId: Not(IsNull()), checkOutAt: Not(IsNull()), ...who } }),
      m.find(AnnualGrant, { where: { ...who } }),
    ]);
    return { today: toSeoulDate(this.clock.now()), holidays, attendances, approved, active, grantRows, annualGrantRows };
  }

  private balance(user: User, month: string, ctx: Awaited<ReturnType<SettlementsService['load']>>): BalanceAsOf {
    return balancesAsOf({
      month,
      asOf: balanceAsOf(month, ctx.today),
      hiredAt: user.hiredAt,
      activeRequests: ctx.active
        .filter((r) => r.userId === user.id)
        .map((r) => ({
          type: r.type,
          targetDate: r.targetDate,
          submittedOn: toSeoulDate(r.createdAt),
          usedAttendanceId: r.usedAttendanceId,
        })),
      offGrants: toOffGrants(ctx.grantRows.filter((a) => a.userId === user.id)),
      annualGrants: toAnnualGrantFacts(ctx.annualGrantRows.filter((g) => g.userId === user.id)),
    });
  }

  private settle(user: User, month: string, ctx: Awaited<ReturnType<SettlementsService['load']>>) {
    return settleMonth({
      month,
      today: ctx.today,
      hiredAt: user.hiredAt,
      holidays: ctx.holidays,
      attendances: ctx.attendances.filter((a) => a.userId === user.id),
      approved: ctx.approved.filter((r) => r.userId === user.id),
    });
  }
}
