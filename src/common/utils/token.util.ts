import * as bcrypt from 'bcrypt';

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
