import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../database/entities/activity-log.entity.js';
import { ActivityLogService } from './activity-log.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
