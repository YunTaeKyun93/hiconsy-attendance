import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogModule } from '../activity-log/activity-log.module.js';
import { env } from '../config/env.js';
import { User } from '../database/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      // env.jwtSecret은 읽을 때 검사하므로 모듈 초기화 시점에 읽는다.
      useFactory: () => ({ secret: env.jwtSecret, signOptions: { algorithm: 'HS256' } }),
    }),
    ActivityLogModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
