import { Module } from '@nestjs/common';
import { DevController } from './dev.controller.js';

/** 개발 모드에서만 AppModule에 들어간다. CLOCK(DevClock)은 전역 ClockModule이 제공한다. */
@Module({ controllers: [DevController] })
export class DevModule {}
