import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';
import { Env } from '../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginAttempt } from './login-attempt.entity';
import { RevokedToken } from './revoked-token.entity';
import { Staff } from './staff.entity';
import { StaffGuard } from './staff.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, LoginAttempt, RevokedToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }) as StringValue },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, StaffGuard],
  exports: [AuthService, StaffGuard],
})
export class AuthModule {}
