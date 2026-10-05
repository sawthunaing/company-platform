import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { Env, validateEnv } from './config/env';
import { ContentModule } from './content/content.module';
import { dataSourceOptions } from './database/data-source';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          redact: ['req.headers.authorization', 'req.body.password'],
          autoLogging: { ignore: (req) => req.url === '/health' },
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => dataSourceOptions(config.get('DATABASE_URL', { infer: true })),
    }),
    AuthModule,
    ContentModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
