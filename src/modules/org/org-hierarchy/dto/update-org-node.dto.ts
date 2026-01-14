// src/modules/master/org-hierarchy/dto/update-org-node.dto.ts

import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrgLevel, Status } from '../../../../common/constants/enums';

export class UpdateOrgNodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEnum(OrgLevel)
  @IsInt()
  level_no?: OrgLevel;

  @IsOptional()
  @IsString()
  parent_id?: string | null;

  @IsOptional()
  @IsString()
  path?: string | null;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsEnum(Status)
  @IsInt()
  status?: Status;

  // ✅ Effective date window
  @IsOptional()
  @IsDateString()
  effective_from?: string | null;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}
