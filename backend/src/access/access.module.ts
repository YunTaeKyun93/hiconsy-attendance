import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogModule } from '../activity-log/activity-log.module.js';
import { WorkRequest } from '../database/entities/request.entity.js';
import { IpAccessService } from './ip-access.service.js';
import { IpStage1Guard } from './ip-stage1.guard.js';
import { IpStage2Guard } from './ip-stage2.guard.js';

@Module({
  imports: [TypeOrmModule.forFeature([WorkRequest]), ActivityLogModule],
  providers: [IpAccessService, IpStage1Guard, IpStage2Guard],
  exports: [IpAccessService, IpStage1Guard, IpStage2Guard],
})
export class AccessModule {}
