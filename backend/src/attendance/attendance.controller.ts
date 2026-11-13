import { BadRequestException, Body, Controller, Get, HttpCode, Inject, Post, Query, Req } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { CLOCK, type Clock } from '../clock/clock.js';
import { toSeoulDate } from '../common/date-time.js';
import { clientIp, type AppRequest, type AuthUser } from '../common/request-context.js';
import { UserRole } from '../database/enums.js';
import {
  AttendanceService,
  type AttendanceView,
  type BoardView,
  type IrregularRow,
  type MyAttendanceView,
} from './attendance.service.js';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

@Controller()
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get('attendance/me')
  mine(@CurrentUser() user: AuthUser): Promise<MyAttendanceView> {
    return this.attendance.mine(user.id);
  }

  @Post('attendance/check-in')
  @HttpCode(200)
  checkIn(@CurrentUser() user: AuthUser, @Req() req: AppRequest): Promise<AttendanceView> {
    return this.attendance.checkIn({ userId: user.id, ip: clientIp(req) });
  }

  @Post('attendance/check-out')
  @HttpCode(200)
  checkOut(@CurrentUser() user: AuthUser, @Req() req: AppRequest): Promise<AttendanceView> {
    return this.attendance.checkOut({ userId: user.id, ip: clientIp(req) });
  }

  /** 미기록 퇴근 직접 입력. body: { workDate: 'YYYY-MM-DD', checkOutTime: 'HH:MM:SS' } */
  @Post('attendance/manual-check-out')
  @HttpCode(200)
  manualCheckOut(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
    @Body() body: unknown,
  ): Promise<AttendanceView> {
    return this.attendance.manualCheckOut({ userId: user.id, ip: clientIp(req) }, body);
  }

  /** 리드: 오늘 팀 보드 */
  @Get('board/today')
  @Roles(UserRole.LEAD)
  board(): Promise<BoardView> {
    return this.attendance.board();
  }

  /** 리드: 미기록·직접 입력 목록. ?month=YYYY-MM (기본: 이번 달) */
  @Get('attendance/irregular')
  @Roles(UserRole.LEAD)
  irregular(@Query('month') month?: string): Promise<IrregularRow[]> {
    const m = month ?? toSeoulDate(this.clock.now()).slice(0, 7);
    if (!MONTH_RE.test(m)) {
      throw new BadRequestException({ statusCode: 400, code: 'INVALID_INPUT', message: 'month(YYYY-MM)를 입력하세요.' });
    }
    return this.attendance.irregular(m);
  }
}
