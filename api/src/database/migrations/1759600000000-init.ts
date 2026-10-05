import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1759600000000 implements MigrationInterface {
  name = 'Init1759600000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE staff (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`
      CREATE TABLE login_attempts (
        id bigserial PRIMARY KEY,
        email text NOT NULL,
        attempted_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX login_attempts_email_time ON login_attempts (email, attempted_at)`);
    await q.query(`
      CREATE TABLE revoked_tokens (
        jti uuid PRIMARY KEY,
        expires_at timestamptz NOT NULL
      )`);
    await q.query(`
      CREATE TABLE home_content (
        id int PRIMARY KEY CHECK (id = 1),
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(
      `INSERT INTO home_content (id, data) VALUES (1, $1)`,
      [
        JSON.stringify({
          heroTitle: 'Welcome',
          heroSubtitle: 'Edit this text in the backoffice.',
          sections: [],
          contact: {},
        }),
      ],
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE home_content`);
    await q.query(`DROP TABLE revoked_tokens`);
    await q.query(`DROP TABLE login_attempts`);
    await q.query(`DROP TABLE staff`);
  }
}
