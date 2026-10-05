import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { hashPassword } from '../src/auth/passwords';
import { configureApp } from '../src/setup';

export const STAFF_EMAIL = 'staff@company.com';
export const STAFF_PASSWORD = 'correct-horse-battery';

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.init();
  return app;
}

// Clears auth state and creates one staff user.
export async function resetAuth(app: INestApplication): Promise<void> {
  const db = app.get(DataSource);
  await db.query('TRUNCATE staff, login_attempts, revoked_tokens');
  await db.query('INSERT INTO staff (email, password_hash) VALUES ($1, $2)', [
    STAFF_EMAIL,
    await hashPassword(STAFF_PASSWORD),
  ]);
}

export async function login(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: STAFF_EMAIL, password: STAFF_PASSWORD })
    .expect(200);
  return res.body.accessToken;
}
