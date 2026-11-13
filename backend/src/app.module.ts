import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClockModule } from './clock/clock.module.js';
import { dataSourceOptions } from './database/data-source.js';
import { HolidaysModule } from './holidays/holidays.module.js';

@Module({
  imports: [TypeOrmModule.forRoot(dataSourceOptions), ClockModule, HolidaysModule],
})
export class AppModule {}
