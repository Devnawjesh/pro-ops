import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In,UpdateResult } from 'typeorm';

import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserScope } from './entities/user-scope.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(UserScope) private readonly scopeRepo: Repository<UserScope>,
  ) {}

  /**
   * Used by AuthService only for login (needs password_hash)
   */
  async findForLogin(username: string) {
    return this.usersRepo.findOne({
      where: { username, status: 1 },
      select: [
        'id',
        'company_id',
        'username',
        'full_name',
        'password_hash',
        'status',
      ] as any,
    });
  }

  /**
   * This loads everything required for authorization:
   * - roles
   * - permissions (flattened)
   * - scopes
   *
   * Returned object becomes req.user
   */
  async getAuthProfile(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, status: 1 },
    });
    if (!user) return null;

    // roles
    const userRoles = await this.userRoleRepo.find({ where: { user_id: userId } });
    const roleIds = userRoles.map((x) => x.role_id);

    const roles = roleIds.length
      ? await this.roleRepo.find({ where: { id: In(roleIds) } })
      : [];

    // permissions via role_permission join
    const rolePerms = roleIds.length
      ? await this.rolePermRepo
          .createQueryBuilder('rp')
          .innerJoinAndSelect('rp.permission', 'p')
          .where('rp.role_id IN (:...roleIds)', { roleIds })
          .getMany()
      : [];

    const permissions = [...new Set(rolePerms.map((rp) => rp.permission.code))];

    // scopes
    const scopes = await this.scopeRepo.find({ where: { user_id: userId } });

    // This is what JwtStrategy returns as req.user
    return {
      id: user.id,
      company_id: user.company_id,
      username: user.username,
      full_name: user.full_name,
      user_type: user.user_type,
      email: user.email,
      mobile: user.mobile,
      roles: roles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
      permissions, // used by PermissionsGuard
      scopes,      // used by UI / filtering
    };
  }
  async setRefreshTokenHash(userId: string, refreshHash: string | null): Promise<UpdateResult> {
    return this.usersRepo.update({ id: userId } as any, { refresh_token_hash: refreshHash } as any);
  }

  async getRefreshTokenHash(userId: string): Promise<string | null> {
    // refresh_token_hash is select:false, so explicitly select it here
    const row = await this.usersRepo.findOne({
      where: { id: userId } as any,
      select: ['id', 'refresh_token_hash'] as any,
    });
    return row?.refresh_token_hash ?? null;
  }
}
