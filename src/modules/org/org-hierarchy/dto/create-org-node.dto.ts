// src/modules/master/org-hierarchy/dto/create-org-node.dto.ts

import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength,IsArray } from 'class-validator';
import { OrgLevel } from '../../../../common/constants/enums';

export class CreateOrgNodeDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsEnum(OrgLevel)
  @IsInt()
  level_no!: OrgLevel;

  @IsOptional()
  @IsString()
  parent_id?: string | null;

  @IsOptional()
  @IsString()
  path?: string | null;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  // ✅ Effective date window
  @IsOptional()
  @IsDateString()
  effective_from?: string | null;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  distributor_ids?: string[];
}
