import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SeedService } from './seed.service';
import { Permission } from '../modules/users/entities/permission.entity';
import { Role } from '../modules/users/entities/role.entity';
import { RolePermission } from '../modules/users/entities/role-permission.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/entities/user-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role, RolePermission, User, UserRole])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
