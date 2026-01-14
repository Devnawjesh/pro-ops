// src/modules/master/org-hierarchy/dto/bulk-import-org.dto.ts

import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OrgLevel } from '../../../../common/constants/enums';

export class BulkOrgRowDto {
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
  parent_code?: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  // ✅ Effective date window
  // Use ISO date string e.g. "2026-01-01" or full ISO "2026-01-01T00:00:00Z"
  @IsOptional()
  @IsDateString()
  effective_from?: string | null;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}

export class BulkImportOrgDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkOrgRowDto)
  rows!: BulkOrgRowDto[];

  @IsOptional()
  upsert?: boolean;
}
