import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogModule } from '../activity-log/activity-log.module.js';
import { Attendance } from '../database/entities/attendance.entity.js';
import { WorkRequest } from '../database/entities/request.entity.js';
import { HolidaysModule } from '../holidays/holidays.module.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, WorkRequest]),
    HolidaysModule,
    ActivityLogModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
