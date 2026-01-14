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

export class UpdateTransferItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  line_no!: number;

  @IsOptional()
  @IsString()
  sku_id?: string;

  @IsOptional()
  @IsString()
  qty_planned?: string;
}

export class UpdateTransferDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  transfer_no?: string;

  @IsOptional()
  @IsDateString()
  transfer_date?: string;

  @IsOptional()
  @IsString()
  from_warehouse_id?: string;

  @IsOptional()
  @IsString()
  to_warehouse_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTransferItemDto)
  items?: UpdateTransferItemDto[];
}
