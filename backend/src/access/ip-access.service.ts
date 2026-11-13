import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { CLOCK, type Clock } from '../clock/clock.js';
import { toSeoulDate } from '../common/date-time.js';
import { env } from '../config/env.js';
import { WorkRequest } from '../database/entities/request.entity.js';
import { RequestStatus, RequestType } from '../database/enums.js';
import { evaluateStage1, parseLabIps, type AccessContext, type AccessGrant } from '../domain/ip-access.js';

@Injectable()
export class IpAccessService {
  private readonly labIps = parseLabIps(env.labIps);

  constructor(
    @InjectRepository(WorkRequest) private readonly requests: Repository<WorkRequest>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** 1단계 판정. 통과하면 2단계에 넘길 문맥, 아니면 null. ip는 정규화된 값. */
  async evaluate(ip: string): Promise<AccessContext | null> {
    const now = this.clock.now();
    // 연구실 IP는 DB를 조회하지 않고 바로 통과(evaluateStage1과 같은 결과).
    if (this.labIps.has(ip)) return { lab: true };

    // 오늘(KST) 날짜의 신청만 DB에서 고르고, 시각 판정은 순수 함수에 맡긴다.
    const rows = await this.requests.find({
      select: { userId: true, targetDate: true, startTime: true, endTime: true },
      where: {
        status: RequestStatus.APPROVED,
        type: In([RequestType.REMOTE, RequestType.WEEKEND_WORK]),
        allowedIp: ip,
        targetDate: toSeoulDate(now),
      },
    });
    const grants: AccessGrant[] = rows
      .filter((r) => r.startTime !== null && r.endTime !== null)
      .map((r) => ({ userId: r.userId, targetDate: r.targetDate, startTime: r.startTime!, endTime: r.endTime! }));

    return evaluateStage1(ip, this.labIps, grants, now);
  }
}
