import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateTransferItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  line_no!: number;

  @IsString()
  sku_id!: string;

  @IsString()
  qty_planned!: string;
}

export class CreateTransferDto {
  @IsString()
  @MaxLength(50)
  transfer_no!: string;

  @IsDateString()
  transfer_date!: string; // YYYY-MM-DD

  @IsString()
  from_warehouse_id!: string;

  @IsString()
  to_warehouse_id!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransferItemDto)
  items!: CreateTransferItemDto[];
}
