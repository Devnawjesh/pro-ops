// dto/outlet-mapping-by-code.dto.ts
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MapOutletOrgByCodeDto {
  @IsString()
  @MaxLength(50)
  outlet_code!: string;

  @IsString()
  @MaxLength(50)
  org_node_code!: string;

  @IsDateString()
  effective_from!: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}

export class MapOutletDistributorByCodeDto {
  @IsString()
  @MaxLength(50)
  outlet_code!: string;

  @IsString()
  @MaxLength(50)
  distributor_code!: string;

  @IsDateString()
  effective_from!: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}

export class BulkMapOutletOrgByCodeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MapOutletOrgByCodeDto)
  rows!: MapOutletOrgByCodeDto[];
}

export class BulkMapOutletDistributorByCodeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MapOutletDistributorByCodeDto)
  rows!: MapOutletDistributorByCodeDto[];
}
