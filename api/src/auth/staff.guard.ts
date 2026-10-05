import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService, TokenPayload } from './auth.service';

export type StaffRequest = Request & { staff: TokenPayload };

// Allows the request only with a valid staff token that was not logged out.
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<StaffRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException({ statusCode: 401, error: 'missing_token', message: 'Login required.' });
    }
    req.staff = await this.auth.verify(token);
    return true;
  }
}
