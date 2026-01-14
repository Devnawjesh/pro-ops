import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Expects request.user.permissions as string[] (we attach it in AuthService validate)
 * AND enforces required permissions from @Permissions()
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // No permissions required => allow
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    if (!user?.permissions) {
      throw new ForbiddenException('No permissions loaded for this user');
    }

    const granted: Set<string> = new Set(user.permissions);

    // require ALL permissions (strict). If you want ANY, change logic here.
    const ok = required.every((p) => granted.has(p));
    if (!ok) {
      throw new ForbiddenException('You do not have required permissions');
    }
    return true;
  }
}
