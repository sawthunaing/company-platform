import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Env } from './config/env';
import { configureApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true }));
}

void bootstrap();
