import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { CheckOutSource } from '../enums.js';
import { User } from './user.entity.js';
import { WorkRequest } from './request.entity.js';

@Entity('attendances')
@Index('uq_attendances_user_work_date', ['userId', 'workDate'], { unique: true })
export class Attendance {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  /** 한국 날짜 'YYYY-MM-DD'. */
  @Column({ name: 'work_date', type: 'date' })
  workDate: string;

  @Column({ name: 'check_in_at', type: 'timestamptz' })
  checkInAt: Date;

  /** null = 미기록 */
  @Column({ name: 'check_out_at', type: 'timestamptz', nullable: true })
  checkOutAt: Date | null;

  @Column({
    name: 'check_out_source',
    type: 'enum',
    enum: Object.values(CheckOutSource),
    enumName: 'check_out_source',
    nullable: true,
  })
  checkOutSource: CheckOutSource | null;

  /** 대조한 주말 근무 신청 */
  @Column({ name: 'request_id', type: 'int', nullable: true })
  requestId: number | null;

  @ManyToOne(() => WorkRequest, { nullable: true })
  @JoinColumn({ name: 'request_id' })
  request: Relation<WorkRequest> | null;
}
