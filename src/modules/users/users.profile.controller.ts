import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UsersProfileService } from './users.profile.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersProfileController {
  constructor(private readonly profile: UsersProfileService) {}

  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }

  @Patch('me')
  updateMe(@CurrentUser() user: any, @Body() body: { full_name?: string; email?: string; mobile?: string }) {
    return this.profile.updateMe(user.id, body);
  }

  @Patch('me/password')
  changeMyPassword(
    @CurrentUser() user: any,
    @Body() body: { old_password: string; new_password: string },
    ) {
        return this.profile.changeMyPassword(user.id, body.old_password, body.new_password);
    }
}
