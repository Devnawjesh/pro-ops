// src/modules/master/warehouse/dto/create-warehouse.dto.ts
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsInt()
  owner_type!: number;

  // bigint as string
  @IsOptional()
  @Matches(/^\d+$/, { message: 'owner_id must be a numeric string' })
  owner_id?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  // keep as string because entity uses string | null (numeric column)
  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/, { message: 'lat must be a numeric string' })
  lat?: string | null;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?$/, { message: 'lng must be a numeric string' })
  lng?: string | null;

  @IsOptional()
  @IsBoolean()
  is_batch_tracked?: boolean;

  @IsOptional()
  @IsBoolean()
  is_expiry_tracked?: boolean;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effective_from must be YYYY-MM-DD' })
  effective_from?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effective_to must be YYYY-MM-DD' })
  effective_to?: string | null;
}
