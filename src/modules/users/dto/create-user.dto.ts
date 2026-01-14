import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserType } from 'src/common/constants/enums';

export class CreateUserDto {
  @IsString() company_id!: string;
  @IsString() user_code!: string;

  @IsString() @IsNotEmpty()
  full_name!: string;

  @IsString() @IsNotEmpty()
  mobile!: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsString() @IsNotEmpty()
  username!: string;

  @IsString() @IsNotEmpty()
  password!: string;

  @IsEnum(UserType)
  user_type!: UserType;
}
