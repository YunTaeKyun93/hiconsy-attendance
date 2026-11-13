import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { clientIp, type AppRequest, type AuthUser } from '../common/request-context.js';
import { UserRole } from '../database/enums.js';
import { AnnualGrantsService, type AnnualGrantView } from './annual-grants.service.js';

/** 리드의 특별 연차 지급 (DESIGN.md 14-3). 모두 리드 전용. */
@Controller('annual-grants')
@Roles(UserRole.LEAD)
export class AnnualGrantsController {
  constructor(private readonly grants: AnnualGrantsService) {}

  @Get()
  list(): Promise<AnnualGrantView[]> {
    return this.grants.list();
  }

  /** body: { userId, days(1~5), reason } */
  @Post()
  grant(@CurrentUser() user: AuthUser, @Req() req: AppRequest, @Body() body: unknown): Promise<AnnualGrantView> {
    return this.grants.grant(user, clientIp(req), body);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AnnualGrantView> {
    return this.grants.cancel(user, clientIp(req), id);
  }
}
