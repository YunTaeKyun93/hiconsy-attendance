import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module.js';
import { HolidaysModule } from '../holidays/holidays.module.js';
import { BalancesService } from './balances.service.js';
import { RequestsController } from './requests.controller.js';
import { RequestsService } from './requests.service.js';

@Module({
  imports: [HolidaysModule, ActivityLogModule],
  controllers: [RequestsController],
  providers: [RequestsService, BalancesService],
})
export class RequestsModule {}
