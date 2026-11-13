import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { RequestStatus, RequestType } from '../enums.js';
import { User } from './user.entity.js';
import { Attendance } from './attendance.entity.js';

const ACTIVE = `"status" IN ('PENDING', 'APPROVED')`;

/** 테이블 `requests`. 전역 Fetch `Request`와 겹치지 않도록 클래스 이름을 WorkRequest로 둔다. */
@Entity('requests')
@Index('uq_requests_user_target_date_active', ['userId', 'targetDate'], {
  unique: true,
  where: ACTIVE,
})
@Index('uq_requests_used_attendance_active', ['usedAttendanceId'], {
  unique: true,
  where: ACTIVE,
})
export class WorkRequest {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'enum', enum: Object.values(RequestType), enumName: 'request_type' })
  type: RequestType;

  /** 'YYYY-MM-DD' */
  @Column({ name: 'target_date', type: 'date' })
  targetDate: string;

  @Column({ type: 'enum', enum: Object.values(RequestStatus), enumName: 'request_status' })
  status: RequestStatus;

  @Column({ type: 'varchar', length: 500 })
  reason: string;

  /** REMOTE·WEEKEND_WORK만 */
  @Column({ name: 'allowed_ip', type: 'varchar', length: 45, nullable: true })
  allowedIp: string | null;

  /** REMOTE·WEEKEND_WORK만. 'HH:MM:SS' */
  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime: string | null;

  /** REMOTE·WEEKEND_WORK만. 'HH:MM:SS' */
  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string | null;

  /** OFF만. 사용한 지급 건(주말 근무 출퇴근 행) */
  @Column({ name: 'used_attendance_id', type: 'int', nullable: true })
  usedAttendanceId: number | null;

  @ManyToOne(() => Attendance, { nullable: true })
  @JoinColumn({ name: 'used_attendance_id' })
  usedAttendance: Relation<Attendance> | null;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: Relation<User> | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  /** 서비스에서 Clock 값으로 채운다. DB 기본값 없음. */
  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
