import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';

import { UsersService } from '../users/users.service';
import { verifyPassword } from '../../common/utils/password.util';
import { hashToken, verifyToken } from '../../common/utils/token.util';
import { AuthJwtPayload } from './types/jwt-payload.type';

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function expiresEnv(key: string): SignOptions['expiresIn'] {
  const v = envOrThrow(key);
  // allow "900" seconds too
  if (/^\d+$/.test(v)) return Number(v);
  return v as SignOptions['expiresIn']; // e.g. "15m", "30d"
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Login:
   * - verify credentials
   * - issue access + refresh
   * - store hashed refresh in DB (revocable)
   */
  async login(username: string, password: string) {
    const user = await this.usersService.findForLogin(username);
    if (!user?.password_hash) throw new UnauthorizedException('Invalid credentials');

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload: AuthJwtPayload = {
      sub: user.id,
      company_id: user.company_id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
    };

    const access_token = await this.jwt.signAsync(payload, {
      secret: envOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: expiresEnv('JWT_ACCESS_EXPIRES'),
    });

    const refresh_token = await this.jwt.signAsync(payload, {
      secret: envOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: expiresEnv('JWT_REFRESH_EXPIRES'),
    });

    // ✅ store hashed refresh token for revoke/rotate support
    await this.usersService.setRefreshTokenHash(user.id, await hashToken(refresh_token));

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        company_id: user.company_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        mobile: user.mobile,
      },
    };
  }

  /**
   * Refresh:
   * - verify refresh JWT signature
   * - compare token with stored hash in DB
   * - issue new access token
   * - rotate refresh token (recommended)
   */
  async refresh(refreshToken: string) {
    let decoded: AuthJwtPayload;

    try {
      decoded = await this.jwt.verifyAsync<AuthJwtPayload>(refreshToken, {
        secret: envOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedHash = await this.usersService.getRefreshTokenHash(decoded.sub);
    if (!storedHash) throw new UnauthorizedException('Refresh token revoked');

    const ok = await verifyToken(refreshToken, storedHash);
    if (!ok) throw new UnauthorizedException('Refresh token mismatch');

    // also ensure user still active
    const user = await this.usersService.getAuthProfile(decoded.sub);
    if (!user) throw new UnauthorizedException('User not found');

    const payload: AuthJwtPayload = {
      sub: user.id,
      company_id: user.company_id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
    };

    const access_token = await this.jwt.signAsync(payload, {
      secret: envOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: expiresEnv('JWT_ACCESS_EXPIRES'),
    });

    // ✅ rotate refresh token
    const new_refresh_token = await this.jwt.signAsync(payload, {
      secret: envOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: expiresEnv('JWT_REFRESH_EXPIRES'),
    });

    await this.usersService.setRefreshTokenHash(user.id, await hashToken(new_refresh_token));

    return {
      access_token,
      refresh_token: new_refresh_token,
    };
  }

  /**
   * Logout:
   * - revoke refresh token by clearing hash
   * - existing access token will expire naturally
   */
  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
    return { ok: true };
  }
}
