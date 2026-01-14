import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';

import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserScope } from './entities/user-scope.entity';
import { UsersAdminService } from './users.admin.service';
import { UsersProfileController } from './users.profile.controller';
import { UsersProfileService } from './users.profile.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      UserRole,
      Permission,
      RolePermission,
      UserScope,
    ]),
  ],
  controllers: [UsersController,UsersProfileController],
  providers: [UsersService,UsersProfileService,UsersAdminService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
