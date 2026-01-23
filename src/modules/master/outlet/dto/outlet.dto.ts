import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  Min, Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { Status } from '../../../../common/constants/enums';

export class CreateOutletDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsInt()
  outlet_type!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  owner_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string | null;

  @IsOptional()
  @IsNumberString()
  lat?: string | null;

  @IsOptional()
  @IsNumberString()
  lng?: string | null;

  @IsOptional()
  @IsDateString()
  effective_from?: string | null;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}

export class UpdateOutletDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsInt()
  outlet_type?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  owner_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string | null;

  @IsOptional()
  @IsNumberString()
  lat?: string | null;

  @IsOptional()
  @IsNumberString()
  lng?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  status?: Status;

  @IsOptional()
  @IsDateString()
  effective_from?: string | null;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}

export class ListOutletDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  outlet_type?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  org_node_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  distributor_id?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class MapOutletOrgDto {
  @IsString()
  outlet_id!: string;

  @IsString()
  org_node_id!: string;

  @IsDateString()
  effective_from!: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}

export class MapOutletDistributorDto {
  @IsString()
  outlet_id!: string;

  @IsString()
  distributor_id!: string;

  @IsDateString()
  effective_from!: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}

export class BulkCreateOutletRowDto extends CreateOutletDto {}

export class BulkCreateOutletDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateOutletRowDto)
  rows!: BulkCreateOutletRowDto[];
}

export class BulkMapOutletOrgDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MapOutletOrgDto)
  rows!: MapOutletOrgDto[];
}

export class BulkMapOutletDistributorDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MapOutletDistributorDto)
  rows!: MapOutletDistributorDto[];
}
