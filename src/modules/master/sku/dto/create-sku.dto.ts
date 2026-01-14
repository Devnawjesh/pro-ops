// src/modules/master/sku/dto/create-sku.dto.ts
import { IsBoolean, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateSkuDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsNumberString()
  brand_id?: string | null;

  @IsOptional()
  @IsNumberString()
  category_id?: string | null;

  @IsOptional()
  @IsNumberString()
  sub_category_id?: string | null;

  @IsOptional()
  @IsString()
  pack_size?: string | null;

  @IsString()
  @IsNotEmpty()
  base_uom!: string;

  @IsString()
  @IsNotEmpty()
  sales_uom!: string;

  // numeric fields stored as string in entity
  @IsOptional()
  @IsString()
  conversion_to_base?: string; // default: "1"

  @IsOptional()
  @IsString()
  mrp?: string | null;

  @IsOptional()
  @IsString()
  tax_rate?: string; // default: "0"

  @IsOptional()
  @IsBoolean()
  is_batch_tracked?: boolean;

  @IsOptional()
  @IsBoolean()
  is_expiry_tracked?: boolean;

  @IsOptional()
  @IsString()
  effective_from?: string | null;

  @IsOptional()
  @IsString()
  effective_to?: string | null;
}
