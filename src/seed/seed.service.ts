import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { PermissionAction } from '../common/constants/enums';
import { Permission } from '../modules/users/entities/permission.entity';
import { Role } from '../modules/users/entities/role.entity';
import { RolePermission } from '../modules/users/entities/role-permission.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/entities/user-role.entity';
import { hashPassword } from '../common/utils/password.util';
import { DeepPartial } from 'typeorm';

type PermissionSeedRow = Pick<
  Permission,
  'code' | 'module' | 'action' | 'description' | 'status'
>;

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  /**
   * Idempotent: safe to run multiple times.
   */
  async run() {
    await this.seedPermissions();
    const superAdmin = await this.seedRolesAndPermissions();
    await this.seedAdminUser(superAdmin.id);

    return { ok: true };
  }

  private async seedPermissions() {
    const modules = ['users', 'roles', 'org', 'orders', 'inventory', 'collections', 'invoices'] as const;

    const actions = [
      PermissionAction.VIEW,
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.MANAGE,
    ] as const;

    const desired: PermissionSeedRow[] = [];

    for (const m of modules) {
      for (const a of actions) {
        desired.push({
          code: `${m}:${a}`,
          module: m,
          action: a,
          description: `${m} ${a}`,
          status: 1,
        });
      }
    }

    const existing = await this.permRepo.find();
    const existingCodes = new Set(existing.map((p) => p.code));

    const toCreate = desired.filter((d) => !existingCodes.has(d.code));
    if (toCreate.length) {
      await this.permRepo.save(this.permRepo.create(toCreate));
    }
  }

  private async seedRolesAndPermissions() {
    const roles = [
      { code: 'SUPER_ADMIN', name: 'Super Admin' },
      { code: 'RSM', name: 'Regional Sales Manager' },
      { code: 'REP', name: 'Sales Representative' },
    ];

    for (const r of roles) {
      const exists = await this.roleRepo.findOne({ where: { code: r.code } });
      if (!exists) await this.roleRepo.save(this.roleRepo.create({ ...r, status: 1 } as any));
    }

    const superAdmin = await this.roleRepo.findOne({ where: { code: 'SUPER_ADMIN' } });
    if (!superAdmin) throw new Error('SUPER_ADMIN role missing');

    // SUPER_ADMIN gets all permissions
    const allPerms = await this.permRepo.find();
    const existingMappings = await this.rolePermRepo.find({ where: { role_id: superAdmin.id } });
    const existingPermIds = new Set(existingMappings.map((m) => m.permission_id));

    const toMap = allPerms
  .filter((p) => !existingPermIds.has(p.id))
  .map((p) => ({
    role_id: superAdmin.id,
    permission_id: p.id,
  }));

if (toMap.length) {
  await this.rolePermRepo.insert(toMap);
}


    // Example: RSM
    const rsm = await this.roleRepo.findOne({ where: { code: 'RSM' } });
    if (rsm) {
      const rsmCodes = ['users:view', 'org:view', 'orders:view', 'collections:view', 'invoices:view'];
      const rsmPerms = await this.permRepo.find({ where: { code: In(rsmCodes) } });

      await this.rolePermRepo.delete({ role_id: rsm.id } as any);
      await this.rolePermRepo.save(
        rsmPerms.map((p) => ({ role_id: rsm.id, permission_id: p.id } as any)),
      );
    }

    // Example: REP
    const rep = await this.roleRepo.findOne({ where: { code: 'REP' } });
    if (rep) {
      const repCodes = ['orders:view', 'orders:create', 'collections:view', 'collections:create'];
      const repPerms = await this.permRepo.find({ where: { code: In(repCodes) } });

      await this.rolePermRepo.delete({ role_id: rep.id } as any);
      await this.rolePermRepo.save(
        repPerms.map((p) => ({ role_id: rep.id, permission_id: p.id } as any)),
      );
    }

    return superAdmin;
  }

  private async seedAdminUser(superAdminRoleId: string) {
    const username = 'admin';
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) return;

    const password_hash = await hashPassword('admin1234');

    const adminEntity: DeepPartial<User> = {
  company_id: '1',
  user_code: 'ADMIN-001',
  full_name: 'System Admin',
  mobile: '01700000000',
  email: 'admin@pro-ops.local',
  username,
  password_hash,
  user_type: 1,
  status: 1,
};

const admin = await this.userRepo.save(this.userRepo.create(adminEntity)) as User;

// now TS knows admin is User (not User[])
await this.userRoleRepo.save(
  this.userRoleRepo.create({
    user_id: admin.id,
    role_id: superAdminRoleId,
  } as any),
);
  }
}
