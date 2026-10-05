import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// One row per failed login. Rows older than the window are ignored.
@Entity('login_attempts')
export class LoginAttempt {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column()
  email: string;

  @Column({ name: 'attempted_at', type: 'timestamptz', default: () => 'now()' })
  attemptedAt: Date;
}
