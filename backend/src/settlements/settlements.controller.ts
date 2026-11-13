import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { isValidMonthStr } from '../common/date-time.js';
import type { AuthUser } from '../common/request-context.js';
import { UserRole } from '../database/enums.js';
import { SettlementsService, type SettlementDetailView, type SettlementListView } from './settlements.service.js';

@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  /** 리드: 전원 요약. ?month=YYYY-MM (기본 이번 달) */
  @Get()
  @Roles(UserRole.LEAD)
  list(@Query('month') month?: string): Promise<SettlementListView> {
    return this.settlements.list(this.month(month));
  }

  /** 본인 요약과 일별 상세 */
  @Get('me')
  mine(@CurrentUser() user: AuthUser, @Query('month') month?: string): Promise<SettlementDetailView> {
    return this.settlements.detail(user.id, this.month(month));
  }

  /** 리드: 한 사람의 요약과 일별 상세 */
  @Get(':userId')
  @Roles(UserRole.LEAD)
  detail(@Param('userId', ParseIntPipe) userId: number, @Query('month') month?: string): Promise<SettlementDetailView> {
    return this.settlements.detail(userId, this.month(month));
  }

  private month(raw: string | undefined): string {
    const m = raw ?? this.settlements.thisMonth();
    if (!isValidMonthStr(m)) {
      throw new BadRequestException({ statusCode: 400, code: 'INVALID_INPUT', message: 'month(YYYY-MM)를 입력하세요.' });
    }
    return m;
  }
}
