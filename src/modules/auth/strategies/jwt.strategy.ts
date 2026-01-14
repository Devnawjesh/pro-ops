import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { AuthJwtPayload } from '../types/jwt-payload.type';

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: envOrThrow('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AuthJwtPayload) {
    const user = await this.usersService.getAuthProfile(payload.sub);
    if (!user) throw new UnauthorizedException('Invalid token user');
    return user;
  }
}