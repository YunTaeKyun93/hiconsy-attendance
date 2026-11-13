import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from './access/access.module.js';
import { IpStage1Guard } from './access/ip-stage1.guard.js';
import { IpStage2Guard } from './access/ip-stage2.guard.js';
import { ActivityLogModule } from './activity-log/activity-log.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RolesGuard } from './auth/roles.guard.js';
import { ClockModule } from './clock/clock.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { dataSourceOptions } from './database/data-source.js';
import { HolidaysModule } from './holidays/holidays.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    ClockModule,
    HolidaysModule,
    ActivityLogModule,
    AccessModule,
    AuthModule,
    AttendanceModule,
    RequestsModule,
  ],
  // 전역 가드는 아래 순서대로 실행된다. 순서를 바꾸지 않는다.
  // ① IP 1단계(모든 요청) → ② JWT(@Public 제외) → ③ IP 2단계(@Public 제외) → ④ 역할(@Roles만)
  providers: [
    { provide: APP_GUARD, useExisting: IpStage1Guard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: IpStage2Guard },
    { provide: APP_GUARD, useExisting: RolesGuard },
  ],
})
export class AppModule {}
