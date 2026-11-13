import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import type { ActivityAction, ActivityPayload } from '../../activity-log/activity-log.types.js';
import { User } from './user.entity.js';

/**
 * 쓰기 전용 이력. 어떤 비즈니스 로직도 이 테이블을 읽지 않는다.
 * action과 payload의 짝은 ActivityLogService.write(ActivityEntry)가 강제한다.
 */
@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  @Column({ type: 'varchar', length: 50 })
  action: ActivityAction;

  @Column({ name: 'target_type', type: 'varchar', length: 30, nullable: true })
  targetType: string | null;

  @Column({ name: 'target_id', type: 'int', nullable: true })
  targetId: number | null;

  @Column({ type: 'varchar', length: 45 })
  ip: string;

  @Column({ type: 'jsonb' })
  payload: ActivityPayload;

  /** 주입한 시계 기준 */
  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;
}
