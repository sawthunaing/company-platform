import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { StaffGuard, StaffRequest } from './staff.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Wrong email or password' })
  @ApiResponse({ status: 429, description: '5 failed logins in 15 minutes' })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 204, description: 'Token revoked' })
  async logout(@Req() req: StaffRequest): Promise<void> {
    await this.auth.logout(req.staff);
  }
}
