import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../enums.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ name: 'login_id', type: 'varchar', length: 50, unique: true })
  loginId: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'enum', enum: Object.values(UserRole), enumName: 'user_role' })
  role: UserRole;

  /** 'YYYY-MM-DD'. 연차 계산 기준. */
  @Column({ name: 'hired_at', type: 'date' })
  hiredAt: string;
}
