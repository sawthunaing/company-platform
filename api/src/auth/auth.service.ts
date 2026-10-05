import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { LoginAttempt } from './login-attempt.entity';
import { DUMMY_HASH, verifyPassword } from './passwords';
import { RevokedToken } from './revoked-token.entity';
import { Staff } from './staff.entity';

export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export interface TokenPayload {
  sub: string;
  email: string;
  jti: string;
  exp: number;
}

const invalidToken = () =>
  new UnauthorizedException({ statusCode: 401, error: 'invalid_token', message: 'Invalid or expired token.' });

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(LoginAttempt) private readonly attempts: Repository<LoginAttempt>,
    @InjectRepository(RevokedToken) private readonly revoked: Repository<RevokedToken>,
    private readonly jwt: JwtService,
  ) {}

  async login(rawEmail: string, password: string): Promise<{ accessToken: string; expiresIn: number }> {
    const email = rawEmail.trim().toLowerCase();
    const since = new Date(Date.now() - ATTEMPT_WINDOW_MS);
    const failed = await this.attempts.count({ where: { email, attemptedAt: MoreThan(since) } });
    if (failed >= MAX_FAILED_ATTEMPTS) {
      throw new HttpException(
        { statusCode: 429, error: 'too_many_attempts', message: 'Too many failed logins. Try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.staff.findOne({ where: { email } });
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      await this.attempts.insert({ email });
      throw new UnauthorizedException({ statusCode: 401, error: 'invalid_credentials', message: 'Wrong email or password.' });
    }

    await this.attempts.delete({ email });
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, jti: randomUUID() });
    const { exp, iat } = this.jwt.decode<{ exp: number; iat: number }>(accessToken);
    return { accessToken, expiresIn: exp - iat };
  }

  async logout(payload: TokenPayload): Promise<void> {
    await this.revoked.upsert({ jti: payload.jti, expiresAt: new Date(payload.exp * 1000) }, ['jti']);
  }

  async verify(token: string): Promise<TokenPayload> {
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw invalidToken();
    }
    if (await this.revoked.exists({ where: { jti: payload.jti } })) {
      throw invalidToken();
    }
    return payload;
  }
}
