import { DataSource } from 'typeorm';
import { hashPassword } from '../auth/passwords';
import { dataSourceOptions } from '../database/data-source';

// Usage: npm run staff:create -- <email> <password>
// Creates a staff user, or resets the password of an existing one.
async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 12) {
    console.error('Usage: npm run staff:create -- <email> <password>  (password: 12+ characters)');
    process.exit(1);
  }

  const db = await new DataSource(dataSourceOptions(process.env.DATABASE_URL ?? '')).initialize();
  try {
    await db.query(
      `INSERT INTO staff (email, password_hash) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email.trim().toLowerCase(), await hashPassword(password)],
    );
    console.log(`Staff user ${email} saved.`);
  } finally {
    await db.destroy();
  }
}

void main();
