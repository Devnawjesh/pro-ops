import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Partial receive for a GRN:
 * - increases qty_received_total on grn_item
 * - creates inv_txn (IN) and optionally lots (if you use lots)
 */
export class ReceiveGrnLineDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  line_no!: number;

  @IsString()
  qty_receive!: string;

  // optional: lot/batch details (only if you want lot tracking)
  @IsOptional()
  @IsString()
  batch_no?: string | null;

  @IsOptional()
  @IsDateString()
  expiry_date?: string | null; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  unit_cost?: string | null;
}

export class ReceiveGrnDto {
  @IsOptional()
  @IsDateString()
  received_at?: string; // ISO time, default now()

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveGrnLineDto)
  lines!: ReceiveGrnLineDto[];

  @IsOptional()
  @IsString()
  remarks?: string;
}
