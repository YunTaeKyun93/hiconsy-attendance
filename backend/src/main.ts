import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // 루프백(Vite 프록시)이 붙인 X-Forwarded-For만 믿는다. true는 헤더 위조로 IP 검사를 우회할 수 있어 금지.
  app.set('trust proxy', 'loopback');
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  await app.listen(env.port);
}

void bootstrap();
