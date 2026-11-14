import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  StreamableFile,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import {
  clientIp,
  type AppRequest,
  type AuthUser,
} from '../common/request-context.js';
import { UserRole } from '../database/enums.js';
import { BalancesService, type BalanceView } from './balances.service.js';
import { RequestsService, type RequestView } from './requests.service.js';

@Controller()
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly balances: BalancesService,
  ) {}

  /** body: { type, targetDate, reason, allowedIp?, startTime?, endTime? } */
  @Post('requests')
  submit(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
    @Body() body: unknown,
  ): Promise<RequestView> {
    return this.requests.submit(user, clientIp(req), body);
  }

  @Get('requests/me')
  mine(@CurrentUser() user: AuthUser): Promise<RequestView[]> {
    return this.requests.mine(user.id);
  }

  @Get('requests/pending')
  @Roles(UserRole.LEAD)
  pending(): Promise<RequestView[]> {
    return this.requests.pending();
  }

  @Post('requests/:id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RequestView> {
    return this.requests.cancel(user, clientIp(req), id);
  }

  @Post('requests/:id/approve')
  @HttpCode(200)
  @Roles(UserRole.LEAD)
  approve(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RequestView> {
    return this.requests.approve(user, clientIp(req), id);
  }

  @Post('requests/:id/reject')
  @HttpCode(200)
  @Roles(UserRole.LEAD)
  /** body: { reason } 반려 사유(필수, 1~500자) */
  reject(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<RequestView> {
    return this.requests.reject(user, clientIp(req), id, body);
  }

  /** 신청서 PDF 다운로드 (FR-REQ-03). 본인 또는 리드. */
  @Get('requests/:id/pdf')
  async pdf(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<StreamableFile> {
    const { filename, buffer } = await this.requests.pdf(user, id);
    // 한글 파일 이름은 filename*(RFC 5987)로. filename은 이를 모르는 클라이언트용 ASCII 대체.
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="request-${id}.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      length: buffer.length,
    });
  }

  @Get('balances/me')
  myBalance(@CurrentUser() user: AuthUser): Promise<BalanceView> {
    return this.balances.of(user.id);
  }
}
