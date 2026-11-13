import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module.js';
import { AnnualGrantsController } from './annual-grants.controller.js';
import { AnnualGrantsService } from './annual-grants.service.js';

@Module({
  imports: [ActivityLogModule],
  controllers: [AnnualGrantsController],
  providers: [AnnualGrantsService],
})
export class AnnualGrantsModule {}
