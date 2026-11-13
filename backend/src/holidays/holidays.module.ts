import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Holiday } from '../database/entities/holiday.entity.js';
import { HolidayBootstrapService } from './holiday-bootstrap.service.js';
import { HolidaysService } from './holidays.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Holiday])],
  providers: [HolidayBootstrapService, HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
