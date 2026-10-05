import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: DataSource) {}

  @Get()
  @ApiResponse({ status: 200, description: '{ status: "ok", database: "up" }' })
  @ApiResponse({ status: 503, description: '{ status: "error", database: "down" }' })
  async check(@Res({ passthrough: true }) res: Response) {
    try {
      await this.db.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'error', database: 'down' };
    }
  }
}
