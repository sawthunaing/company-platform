import { Column, Entity, PrimaryColumn } from 'typeorm';

// A logged-out token stays here until it would have expired anyway.
@Entity('revoked_tokens')
export class RevokedToken {
  @PrimaryColumn('uuid')
  jti: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}
