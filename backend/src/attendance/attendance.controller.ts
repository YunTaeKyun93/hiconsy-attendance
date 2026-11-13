import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators.js';
import {
  clientIp,
  type AppRequest,
  type AuthUser,
} from '../common/request-context.js';
import {
  AttendanceService,
  type AttendanceView,
  type MyAttendanceView,
} from './attendance.service.js';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('me')
  mine(@CurrentUser() user: AuthUser): Promise<MyAttendanceView> {
    return this.attendance.mine(user.id);
  }

  @Post('check-in')
  @HttpCode(200)
  checkIn(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
  ): Promise<AttendanceView> {
    return this.attendance.checkIn({ userId: user.id, ip: clientIp(req) });
  }

  @Post('check-out')
  @HttpCode(200)
  checkOut(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
  ): Promise<AttendanceView> {
    return this.attendance.checkOut({ userId: user.id, ip: clientIp(req) });
  }

  /** 미기록 퇴근 직접 입력. body: { workDate: 'YYYY-MM-DD', checkOutTime: 'HH:MM:SS' } */
  @Post('manual-check-out')
  @HttpCode(200)
  manualCheckOut(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
    @Body() body: unknown,
  ): Promise<AttendanceView> {
    return this.attendance.manualCheckOut(
      { userId: user.id, ip: clientIp(req) },
      body,
    );
  }
}
