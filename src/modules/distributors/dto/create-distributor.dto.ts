// src/modules/master/distributor/dto/create-distributor.dto.ts
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DistributorType } from 'src/common/constants/enums';

export class CreateDistributorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsEnum(DistributorType)
  distributor_type!: number;

  // required if SUB (enforced in service)
  @IsOptional()
  @IsNumberString()
  parent_distributor_id?: string | null;

  @IsOptional()
  @IsString()
  trade_name?: string | null;

  @IsOptional()
  @IsString()
  owner_name?: string | null;

  @IsOptional()
  @IsString()
  mobile?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsNumberString()
  credit_limit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  payment_terms_days?: number;

  @IsOptional()
  @IsString()
  vat_registration_no?: string | null;

  @IsOptional()
  @IsString()
  tin_no?: string | null;

  @IsOptional()
  @IsString()
  erp_partner_id?: string | null;

  // master validity (optional)
  @IsOptional()
  @IsDateString()
  effective_from?: string | null;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}
