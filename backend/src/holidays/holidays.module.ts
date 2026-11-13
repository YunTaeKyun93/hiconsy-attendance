import { Module } from '@nestjs/common';
import { HolidayBootstrapService } from './holiday-bootstrap.service.js';

@Module({
  providers: [HolidayBootstrapService],
})
export class HolidaysModule {}
