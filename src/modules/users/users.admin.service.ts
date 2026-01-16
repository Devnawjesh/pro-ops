import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserScope } from './entities/user-scope.entity';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';

import { hashPassword } from '../../common/utils/password.util';
import { ScopeType, Status } from '../../common/constants/enums';

@Injectable()
export class UsersAdminService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePermRepo: Repository<RolePermission>,

    @InjectRepository(UserScope) private readonly scopeRepo: Repository<UserScope>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  // -------------------- Helpers --------------------

  private isPgUniqueViolation(e: any): boolean {
    return e?.code === '23505';
  }

  private uniqueToConflict(e: any, message: string): never {
    if (this.isPgUniqueViolation(e)) throw new ConflictException(message);
    throw e;
  }

  private async getUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } as any });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async getRoleOrThrow(roleId: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } as any });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private validateScopeRow(s: {
    scope_type: number;
    org_node_id?: string | null;
    route_id?: string | null;
    distributor_id?: string | null;
  }) {
    const org = s.org_node_id ?? null;
    const route = s.route_id ?? null;
    const dist = s.distributor_id ?? null;
    console.log(org);
    const hasOrg = !!org;
    const hasRoute = !!route;
    const hasDist = !!dist;

    const count = Number(hasOrg) + Number(hasRoute) + Number(hasDist);

    if (s.scope_type === ScopeType.GLOBAL) {
      if (count !== 0) throw new BadRequestException('GLOBAL scope cannot have ids');
      return;
    }

    if (count !== 1) {
      throw new BadRequestException(
        'Exactly one scope id must be provided (org_node_id OR route_id OR distributor_id)',
      );
    }

    switch (s.scope_type) {
      case ScopeType.HIERARCHY:
        if (!hasOrg) throw new BadRequestException('HIERARCHY requires org_node_id');
        return;

      case ScopeType.ROUTE:
        if (!hasRoute) throw new BadRequestException('ROUTE requires route_id');
        return;

      case ScopeType.DISTRIBUTOR:
        if (!hasDist) throw new BadRequestException('DISTRIBUTOR requires distributor_id');
        return;

      default:
        throw new BadRequestException('Invalid scope_type');
    }
  }

  private assertRequired(dto: any, keys: string[]) {
    for (const k of keys) {
      if (dto?.[k] === undefined || dto?.[k] === null || dto?.[k] === '') {
        throw new BadRequestException(`${k} is required`);
      }
    }
  }

  // -------------------- Users CRUD --------------------

  async listUsers(params?: {
    company_id?: string;
    status?: number;
    user_type?: number;
    q?: string;
    take?: number;
    skip?: number;
  }) {
    const take = Math.min(Math.max(params?.take ?? 50, 1), 200);
    const skip = Math.max(params?.skip ?? 0, 0);

    const qb = this.userRepo.createQueryBuilder('u');

    if (params?.company_id) qb.andWhere('u.company_id = :company_id', { company_id: params.company_id });
    if (params?.status !== undefined) qb.andWhere('u.status = :status', { status: params.status });
    if (params?.user_type !== undefined) qb.andWhere('u.user_type = :user_type', { user_type: params.user_type });

    if (params?.q?.trim()) {
      const q = `%${params.q.trim()}%`;
      qb.andWhere(
        '(u.username ILIKE :q OR u.mobile ILIKE :q OR u.full_name ILIKE :q OR u.user_code ILIKE :q)',
        { q },
      );
    }

    qb.orderBy('u.id', 'DESC').take(take).skip(skip);

    const [rows, total] = await qb.getManyAndCount();
    return { total, rows };
  }

  async getUser(userId: string) {
    return this.getUserOrThrow(userId);
  }

  async getUserDetails(userId: string) {
    const user = await this.getUserOrThrow(userId);

    const userRoles = await this.userRoleRepo.find({
      where: { user_id: userId } as any,
      relations: ['role'],
    });

    const scopes = await this.scopeRepo.find({ where: { user_id: userId } });

    return {
      user,
      roles: userRoles.map((ur) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
      })),
      scopes,
    };
  }

  async createUser(dto: any) {
    this.assertRequired(dto, [
      'company_id',
      'username',
      'password',
      'full_name',
      'mobile',
      'user_code',
      'user_type',
    ]);

    // Quick friendly check (DB unique will also handle)
    const exists = await this.userRepo.findOne({
      where: { company_id: dto.company_id, username: dto.username } as any,
    });
    if (exists) throw new ConflictException('Username already exists');

    const password_hash = await hashPassword(dto.password);

    const user = this.userRepo.create({
      company_id: dto.company_id,
      user_code: dto.user_code,
      full_name: dto.full_name,
      mobile: dto.mobile,
      email: dto.email ?? null,
      username: dto.username,
      password_hash,
      user_type: dto.user_type,
      status: Status.ACTIVE,
      reporting_manager_id: dto.reporting_manager_id ?? null,
    } as any);

    try {
      return await this.userRepo.save(user);
    } catch (e: any) {
      this.uniqueToConflict(e, 'Duplicate username / user_code / mobile');
    }
  }

  async updateUser(userId: string, patch: any) {
    await this.getUserOrThrow(userId);

    // forbidden direct patch fields
    const forbidden = ['password', 'password_hash', 'refresh_token_hash', 'id', 'company_id'];
    for (const k of forbidden) {
      if (k in (patch ?? {})) throw new BadRequestException(`Field not allowed: ${k}`);
    }

    // Validate status
    if (patch?.status !== undefined && ![0, 1].includes(Number(patch.status))) {
      throw new BadRequestException('status must be 0 or 1');
    }

    try {
      await this.userRepo.update({ id: userId } as any, { ...patch } as any);
    } catch (e: any) {
      this.uniqueToConflict(e, 'Duplicate username / user_code / mobile');
    }

    // if deactivated => revoke refresh token
    if (patch?.status === 0) {
      await this.userRepo.update({ id: userId } as any, { refresh_token_hash: null } as any);
    }

    return this.getUserOrThrow(userId);
  }

  async setStatus(userId: string, status: number) {
    if (![0, 1].includes(Number(status))) throw new BadRequestException('status must be 0 or 1');

    await this.getUserOrThrow(userId);

    await this.userRepo.update({ id: userId } as any, { status } as any);

    if (Number(status) === 0) {
      await this.userRepo.update({ id: userId } as any, { refresh_token_hash: null } as any);
    }

    return this.getUserOrThrow(userId);
  }

  async resetPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('new_password must be at least 6 characters');
    }

    await this.getUserOrThrow(userId);

    const password_hash = await hashPassword(newPassword);

    await this.userRepo.update(
      { id: userId } as any,
      { password_hash, refresh_token_hash: null } as any,
    );

    return { user_id: userId };
  }

  // -------------------- Roles --------------------

  async listRoles() {
    return this.roleRepo.find({ order: { id: 'ASC' as any } });
  }

  async createRole(code: string, name: string) {
    if (!code?.trim()) throw new BadRequestException('code is required');
    if (!name?.trim()) throw new BadRequestException('name is required');

    const exists = await this.roleRepo.findOne({ where: { code: code.trim() } });
    if (exists) throw new ConflictException('Role code already exists');

    const role = this.roleRepo.create({ code: code.trim(), name: name.trim(), status: 1 });

    try {
      return await this.roleRepo.save(role);
    } catch (e: any) {
      this.uniqueToConflict(e, 'Role code already exists');
    }
  }

  async addRolePermissions(roleId: string, permissionCodes: string[]) {
  await this.getRoleOrThrow(roleId);

  const perms = permissionCodes?.length
    ? await this.permRepo.find({ where: { code: In(permissionCodes) } })
    : [];

  const found = new Set(perms.map((p) => p.code));
  const missing = (permissionCodes ?? []).filter((c) => !found.has(c));
  if (missing.length) throw new BadRequestException(`Invalid permission codes: ${missing.join(', ')}`);

  if (!perms.length) return { role_id: roleId, added: [], total: await this.countRolePerms(roleId) };

  await this.dataSource.transaction(async (trx) => {
    const rpRepo = trx.getRepository(RolePermission);

    // Find existing mappings for this role among requested permissions
    const existing = await rpRepo.find({
      where: {
        role_id: roleId,
        permission_id: In(perms.map((p) => p.id)),
      } as any,
      select: { permission_id: true } as any,
    });

    const existingIds = new Set(existing.map((x: any) => String(x.permission_id)));

    const toInsert = perms
      .filter((p) => !existingIds.has(String(p.id)))
      .map((p) => ({ role_id: roleId, permission_id: p.id }));

    if (toInsert.length) {
      await rpRepo.insert(toInsert as any);
    }
  });

  return { role_id: roleId, added: perms.map((p) => p.code) };
}

private async countRolePerms(roleId: string) {
  return this.rolePermRepo.count({ where: { role_id: roleId } as any });
}
async removeRolePermissions(roleId: string, permissionCodes: string[]) {
  await this.getRoleOrThrow(roleId);

  const perms = permissionCodes?.length
    ? await this.permRepo.find({ where: { code: In(permissionCodes) } })
    : [];

  const found = new Set(perms.map((p) => p.code));
  const missing = (permissionCodes ?? []).filter((c) => !found.has(c));
  if (missing.length) throw new BadRequestException(`Invalid permission codes: ${missing.join(', ')}`);

  if (!perms.length) return { role_id: roleId, removed: [] };

  await this.rolePermRepo.delete({
    role_id: roleId,
    permission_id: In(perms.map((p) => p.id)),
  } as any);

  return { role_id: roleId, removed: perms.map((p) => p.code) };
}

// -------------------- Permissions --------------------

async listPermissions(params?: { q?: string; status?: number }) {
  const qb = this.permRepo.createQueryBuilder('p');

  if (params?.status !== undefined) {
    qb.andWhere('p.status = :status', { status: params.status });
  }

  if (params?.q?.trim()) {
    const q = `%${params.q.trim()}%`;
    qb.andWhere('(p.code ILIKE :q OR p.name ILIKE :q)', { q });
  }

  qb.orderBy('p.code', 'ASC');

  const rows = await qb.getMany();
  return { total: rows.length, rows };
}

async createPermission(dto: { code: string; module: string;action: string; description?: string | null }) {
  if (!dto?.code?.trim()) throw new BadRequestException('code is required');
  if (!dto?.module?.trim()) throw new BadRequestException('module is required');
  if (!dto?.action?.trim()) throw new BadRequestException('action is required');
  const code = dto.code.trim();

  const exists = await this.permRepo.findOne({ where: { code } as any });
  if (exists) throw new ConflictException('Permission code already exists');

  const perm = this.permRepo.create({
    code,
    module: dto.module.trim(),
    action: dto.action.trim(),
    description: dto.description ?? null,
    status: Status.ACTIVE,
  } as any);

  try {
    return await this.permRepo.save(perm);
  } catch (e: any) {
    this.uniqueToConflict(e, 'Permission code already exists');
  }
}

  // -------------------- User Roles --------------------

  async setUserRoles(userId: string, roleCodes: string[]) {
    const user = await this.getUserOrThrow(userId);

    const roles = roleCodes?.length
      ? await this.roleRepo.find({ where: { code: In(roleCodes) } })
      : [];

    // validate missing codes
    const foundCodes = new Set(roles.map((r) => r.code));
    const missing = (roleCodes ?? []).filter((c) => !foundCodes.has(c));
    if (missing.length) throw new BadRequestException(`Invalid role codes: ${missing.join(', ')}`);

    await this.dataSource.transaction(async (trx) => {
      const urRepo = trx.getRepository(UserRole);
      await urRepo.delete({ user_id: userId } as any);

      if (roles.length) {
        await urRepo.insert(roles.map((r) => ({ user_id: userId, role_id: r.id } as any)));
      }

      // Optional: SUPER_ADMIN => ensure GLOBAL scope
      const isSuper = roles.some((r) => r.code === 'SUPER_ADMIN');
      if (isSuper) {
        const scopeRepo = trx.getRepository(UserScope);
        await scopeRepo.delete({ user_id: userId } as any);
        await scopeRepo.insert({
          company_id: user.company_id,
          user_id: userId,
          scope_type: ScopeType.GLOBAL,
          org_node_id: null,
          route_id: null,
          distributor_id: null,
        } as any);
      }
    });

    return {
      user_id: userId,
      roles: roles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    };
  }

  // -------------------- Scopes --------------------

  async getUserScopes(userId: string) {
    await this.getUserOrThrow(userId);
    return this.scopeRepo.find({ where: { user_id: userId } });
  }

  async setUserScopes(
    userId: string,
    scopes: Array<{
      scope_type: number;
      org_node_id?: string | null;
      route_id?: string | null;
      distributor_id?: string | null;
    }>,
  ) {
    const user = await this.getUserOrThrow(userId);

    if (!Array.isArray(scopes)) throw new BadRequestException('scopes must be an array');
    scopes.forEach((s) => this.validateScopeRow(s));

    try {
      await this.dataSource.transaction(async (trx) => {
        const scopeRepo = trx.getRepository(UserScope);

        await scopeRepo.delete({ user_id: userId } as any);

        if (!scopes.length) return;

        const rows = scopes.map((s) => ({
          company_id: user.company_id,
          user_id: userId,
          scope_type: s.scope_type,
          org_node_id: s.org_node_id ?? null,
          route_id: s.route_id ?? null,
          distributor_id: s.distributor_id ?? null,
        }));

        await scopeRepo.insert(rows as any);
      });
    } catch (e: any) {
      this.uniqueToConflict(e, 'Duplicate scope entry for this user');
    }

    return { user_id: userId, count: scopes.length };
  }
}
