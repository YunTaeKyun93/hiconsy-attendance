import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { CLOCK, type Clock } from '../clock/clock.js';
import {
  addMonthsClamped,
  toSeoulDate,
  yearMonth,
  type DateStr,
} from '../common/date-time.js';
import { User } from '../database/entities/user.entity.js';
import { accruedAnnualLeave, annualRemaining, grantedAnnualDays } from '../domain/annual-leave.js';
import {
  offGrantsOn,
  offRemaining,
  type OffGrantStatus,
} from '../domain/off.js';
import { remoteUsage } from '../domain/remote.js';
import { loadBalanceFacts } from './balance-facts.js';

export interface BalanceView {
  today: DateStr;
  /** accrued: 매달 적립, granted: 리드의 특별 지급(ACTIVE), used: 대기+승인 */
  annual: { accrued: number; granted: number; used: number; remaining: number };
  /** 이번 달, 다음 달 */
  remote: { month: string; used: number; remaining: number }[];
  off: {
    remaining: number;
    /** 오늘 기준 상태. 만료되지 않은 것만 잔여로 센다. */
    grants: {
      workDate: DateStr;
      expiresOn: DateStr;
      status: Exclude<OffGrantStatus, 'NOT_YET'>;
    }[];
  };
}

@Injectable()
export class BalancesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async of(userId: number): Promise<BalanceView> {
    const today = toSeoulDate(this.clock.now());
    const m = this.dataSource.manager;
    const user = await m.findOneOrFail(User, { where: { id: userId } });
    const facts = await loadBalanceFacts(m, userId);

    const accrued = accruedAnnualLeave(user.hiredAt, today);
    const granted = grantedAnnualDays(facts.annualGrants, today);
    const thisMonth = yearMonth(today);
    const nextMonth = yearMonth(addMonthsClamped(`${thisMonth}-01`, 1));

    return {
      today,
      annual: {
        accrued,
        granted,
        used: facts.activeAnnualCount,
        remaining: annualRemaining(accrued + granted, facts.activeAnnualCount),
      },
      remote: [
        remoteUsage(thisMonth, facts.activeRemoteDates),
        remoteUsage(nextMonth, facts.activeRemoteDates),
      ],
      off: {
        remaining: offRemaining(today, facts.offGrants, facts.offUsedIds),
        // 지급일은 항상 오늘 이전이라 NOT_YET은 나오지 않는다.
        grants: offGrantsOn(today, facts.offGrants, facts.offUsedIds).map(
          ({ workDate, expiresOn, status }) => ({
            workDate,
            expiresOn,
            status: status as Exclude<OffGrantStatus, 'NOT_YET'>,
          }),
        ),
      },
    };
  }
}
