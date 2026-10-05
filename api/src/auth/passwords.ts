import * as bcrypt from 'bcrypt';

const ROUNDS = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Compared against when the email is unknown, so both paths take the same time.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);
