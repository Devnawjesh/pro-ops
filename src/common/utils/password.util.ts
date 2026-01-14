import * as bcrypt from 'bcrypt';

export async function hashPassword(plain: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(plain, saltRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
