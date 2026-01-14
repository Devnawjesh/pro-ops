import {
  Body,
  Controller,
  Req,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UsersAdminService } from './users.admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ResetPasswordDto } from './dto/ResetPasswordDto.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserScopesDto } from './dto/SetUserScopesDto.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * NOTE:
 * This controller is "admin endpoints".
 * For production, you can split: roles.controller.ts and scopes.controller.ts.
 */

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class UsersController {
  constructor(private readonly admin: UsersAdminService) {}
  // ---------------- ROLES ----------------
 // ---------- Users CRUD ----------
  @Permissions('users:view')
  @Get('users')
  listUsers() {
    return this.admin.listUsers();
  }
  @Permissions('users:view')
    @Get('users/me')
    me(@CurrentUser() user: any) {
    return user;
  }

  @Permissions('users:view')
  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

@Permissions('users:manage')
@Patch('users/:id/reset-password')
resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
  return this.admin.resetPassword(id, dto.new_password);
}

@Permissions('users:manage')
@Patch('users/:id/status')
setStatus(@Param('id') id: string, @Body() body: { status: number }) {
  return this.admin.setStatus(id, body.status);
}

@Permissions('users:view')
@Get('users/:id/details')
getUserDetails(@Param('id') id: string) {
  return this.admin.getUserDetails(id);
}

  @Permissions('users:manage')
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.admin.createUser(dto);
  }


@Permissions('users:manage')
@Patch('users/:id')
updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
  return this.admin.updateUser(id, dto);
}


  // ---------- Role assignment ----------
  @Permissions('users:manage')
  @Patch('users/:id/roles')
  setRoles(@Param('id') userId: string, @Body() body: { role_codes: string[] }) {
    return this.admin.setUserRoles(userId, body.role_codes);
  }

  @Permissions('roles:view')
  @Get('roles')
  async listRoles() {
    return this.admin.listRoles();
  }

  @Permissions('roles:manage')
  @Post('roles')
  async createRole(@Body() body: { code: string; name: string }) {
    return this.admin.createRole(body.code, body.name);
  }
// ---------------- PERMISSIONS ----------------

@Permissions('permissions:view')
@Get('permissions')
listPermissions() {
  return this.admin.listPermissions();
}

@Permissions('permissions:manage')
@Post('permissions')
createPermission(
  @Body() body: { code: string; module: string; action: string; description?: string | null },
) {
  return this.admin.createPermission(body);
}

  /**
   * Update role permissions from frontend.
   * body.permission_codes = ["users:view","users:manage", ...]
   */
  @Permissions('roles:manage')
@Patch('roles/:id/permissions')
addRolePerms(@Param('id') roleId: string, @Body() body: { permission_codes: string[] }) {
  return this.admin.addRolePermissions(roleId, body.permission_codes);
}

@Permissions('roles:manage')
@Patch('roles/:id/permissions/remove')
removeRolePerms(@Param('id') roleId: string, @Body() body: { permission_codes: string[] }) {
  return this.admin.removeRolePermissions(roleId, body.permission_codes);
}

  // ---------------- USER SCOPES ----------------

@Permissions('users:manage')
@Post('users/:id/scopes')
setUserScopes(@Param('id') userId: string, @Body() dto: SetUserScopesDto) {
  return this.admin.setUserScopes(userId, dto.scopes);
}

  @Permissions('users:view')
  @Get('users/:id/scopes')
  async getUserScopes(@Param('id') userId: string) {
    return this.admin.getUserScopes(userId);
  }
}
