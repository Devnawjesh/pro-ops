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
import { ReceiveGrnLineDto } from './receive-grn.dto';

export class CreateGrnItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  line_no!: number;

  @IsString()
  sku_id!: string;

  // numeric as string
  @IsString()
  qty_expected!: string;

  @IsOptional()
  @IsString()
  unit_cost?: string | null;

}

export class CreateGrnDto {
  @IsString()
  @MaxLength(50)
  grn_no!: string;

  // YYYY-MM-DD
  @IsDateString()
  grn_date!: string;

  @IsString()
  warehouse_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference_no?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGrnItemDto)
  items!: CreateGrnItemDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ReceiveGrnLineDto)
  receive_lines?: ReceiveGrnLineDto[];

  @IsOptional()
  auto_post?: boolean;
}
