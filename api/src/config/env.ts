import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

export class Env {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN = '1h';

  // Comma-separated list of the frontends allowed to call the API.
  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS: string;

  @IsOptional()
  @IsInt()
  PORT = 3000;

  @IsOptional()
  @IsString()
  LOG_LEVEL = 'info';
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { enableImplicitConversion: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const fields = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ');
    throw new Error(`Invalid environment: ${fields}`);
  }
  return env;
}
