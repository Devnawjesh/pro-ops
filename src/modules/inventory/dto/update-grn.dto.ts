import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateGrnItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  line_no!: number;

  @IsOptional()
  @IsString()
  sku_id?: string;

  @IsOptional()
  @IsString()
  qty_expected?: string;

  @IsOptional()
  @IsString()
  unit_cost?: string | null;
}

export class UpdateGrnDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  grn_no?: string;

  @IsOptional()
  @IsDateString()
  grn_date?: string;

  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference_no?: string | null;

  /**
   * If you want "replace lines" behavior: pass full items array.
   * If you want "patch lines": handle in service by line_no.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateGrnItemDto)
  items?: UpdateGrnItemDto[];
}
