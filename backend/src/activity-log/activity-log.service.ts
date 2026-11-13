import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CLOCK, type Clock } from '../clock/clock.js';
import { ActivityLog } from '../database/entities/activity-log.entity.js';
import type { ActivityEntry, ActivityMeta } from './activity-log.types.js';

/** 이력 쓰기 전용. 읽는 메서드를 두지 않는다(어떤 비즈니스 로직도 이력을 읽지 않는다). */
@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog) private readonly repo: Repository<ActivityLog>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async write(entry: ActivityEntry, meta: ActivityMeta): Promise<void> {
    await this.repo.insert({
      userId: entry.userId,
      action: entry.action,
      payload: entry.payload,
      ip: meta.ip,
      targetType: meta.targetType ?? null,
      targetId: meta.targetId ?? null,
      occurredAt: this.clock.now(),
    });
  }
}
