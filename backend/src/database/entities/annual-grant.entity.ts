import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { AnnualGrantStatus } from '../enums.js';
import { User } from './user.entity.js';

/** 리드의 특별 연차 지급 (DESIGN.md 14-3). 지급이라는 사실만 저장하고 잔여는 계산한다. 취소는 상태 변경. */
@Entity('annual_grants')
export class AnnualGrant {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'BY DEFAULT' })
  id: number;

  /** 받는 사람 */
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  /** 1~5 */
  @Column({ type: 'int' })
  days: number;

  @Column({ type: 'varchar', length: 500 })
  reason: string;

  @Column({ type: 'enum', enum: Object.values(AnnualGrantStatus), enumName: 'annual_grant_status' })
  status: AnnualGrantStatus;

  @Column({ name: 'granted_by', type: 'int' })
  grantedBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'granted_by' })
  granter: Relation<User>;

  /** 서비스에서 Clock 값으로 채운다. 한국 날짜가 지급일. */
  @Column({ name: 'granted_at', type: 'timestamptz' })
  grantedAt: Date;

  @Column({ name: 'canceled_by', type: 'int', nullable: true })
  canceledBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'canceled_by' })
  canceler: Relation<User> | null;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt: Date | null;
}
