import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserType } from 'src/common/constants/enums';

export class UpdateUserDto {
  @IsOptional() @IsString()
  full_name?: string;

  @IsOptional() @IsString()
  mobile?: string;

  @IsOptional() @IsEmail()
  email?: string | null;

  @IsOptional() @IsEnum(UserType)
  user_type?: UserType;

  @IsOptional()
  status?: number; // 1 active 0 inactive
}
