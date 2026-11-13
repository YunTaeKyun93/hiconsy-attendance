import 'reflect-metadata';
import { join } from 'node:path';
import pg from 'pg';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { env } from '../config/env.js';
import { ActivityLog } from './entities/activity-log.entity.js';
import { AnnualGrant } from './entities/annual-grant.entity.js';
import { Attendance } from './entities/attendance.entity.js';
import { Holiday } from './entities/holiday.entity.js';
import { WorkRequest } from './entities/request.entity.js';
import { User } from './entities/user.entity.js';

// date 칸은 'YYYY-MM-DD' 문자열로 받는다. 기본 파서는 Date(서버 로컬 자정)로 바꿔 하루가 밀릴 수 있다.
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value);

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  entities: [User, Attendance, WorkRequest, ActivityLog, Holiday, AnnualGrant],
  migrations: [join(import.meta.dirname, 'migrations', '*.js')],
  synchronize: false,
  migrationsRun: false,
};

// TypeORM CLI용 (dist/database/data-source.js)
export default new DataSource(dataSourceOptions);
