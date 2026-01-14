import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';

@Injectable()
export class UsersProfileService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private isPgUniqueViolation(e: any): boolean {
    return e?.code === '23505';
  }

  async updateMe(
    userId: string,
    patch: { full_name?: string; mobile?: string; email?: string | null },
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } as any });
    if (!user) throw new NotFoundException('User not found');

    const hasAny =
      patch.full_name !== undefined ||
      patch.mobile !== undefined ||
      patch.email !== undefined;

    if (!hasAny) throw new BadRequestException('No fields to update');

    const update: Partial<User> = {};

    if (patch.full_name !== undefined) {
      const v = patch.full_name.trim();
      if (!v) throw new BadRequestException('full_name cannot be empty');
      update.full_name = v;
    }

    if (patch.mobile !== undefined) {
      const v = patch.mobile.trim();
      if (!v) throw new BadRequestException('mobile cannot be empty');
      update.mobile = v as any;
    }

    if (patch.email !== undefined) {
      const v = patch.email ? patch.email.trim() : null;
      update.email = v as any;
    }

    try {
      await this.userRepo.update({ id: userId } as any, update as any);
    } catch (e: any) {
      if (this.isPgUniqueViolation(e)) {
        throw new ConflictException('Duplicate mobile / username / user_code');
      }
      throw e;
    }

    return this.userRepo.findOne({ where: { id: userId } as any });
  }

  async changeMyPassword(userId: string, oldPassword: string, newPassword: string) {
    if (!oldPassword) throw new BadRequestException('old_password is required');
    if (!newPassword) throw new BadRequestException('new_password is required');
    if (newPassword.length < 6) throw new BadRequestException('new_password must be at least 6 characters');

    const user = await this.userRepo.findOne({
      where: { id: userId } as any,
      select: ['id', 'password_hash'] as any,
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.password_hash) throw new BadRequestException('Password is not set for this user');

    const ok = await verifyPassword(oldPassword, user.password_hash);
    if (!ok) throw new BadRequestException('Old password is incorrect');

    const password_hash = await hashPassword(newPassword);

    // revoke refresh token so user must login again
    await this.userRepo.update(
      { id: userId } as any,
      { password_hash, refresh_token_hash: null } as any,
    );

    return { user_id: userId };
  }
}
