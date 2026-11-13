import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Holiday } from '../database/entities/holiday.entity.js';
import { insertHolidaySeed } from './holiday-seed.js';

/** 서버 시작 시 holidays 테이블이 비어 있으면 저장소의 시드 파일로 채운다. 네트워크를 쓰지 않는다. */
@Injectable()
export class HolidayBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HolidayBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.dataSource.getRepository(Holiday).count();
    if (count > 0) return;

    const inserted = await insertHolidaySeed(this.dataSource.manager);
    if (inserted === 0) {
      this.logger.warn('holidays 테이블과 시드 파일이 모두 비어 있습니다. npm run sync:holidays를 실행하세요.');
    } else {
      this.logger.log(`시드 파일에서 공휴일 ${inserted}건을 넣었습니다.`);
    }
  }
}
