import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Staff } from '../auth/staff.entity';
import { LoginAttempt } from '../auth/login-attempt.entity';
import { RevokedToken } from '../auth/revoked-token.entity';
import { HomeContent } from '../content/home-content.entity';
import { Init1759600000000 } from './migrations/1759600000000-init';

export function dataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [Staff, LoginAttempt, RevokedToken, HomeContent],
    migrations: [Init1759600000000],
    migrationsRun: true,
    synchronize: false,
  };
}

// Used by the TypeORM CLI (npm run typeorm).
export default new DataSource(dataSourceOptions(process.env.DATABASE_URL ?? ''));
