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
 * Dispatch:
 * - create inv_txn OUT from from_warehouse_id
 * - increase qty_dispatched_total on transfer_item
 */
export class DispatchTransferLineDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  line_no!: number;

  @IsString()
  qty_dispatch!: string;

  // optional: lot picking (if using lots)
  @IsOptional()
  @IsArray()
  lot_allocations?: { lot_id: string; qty: string }[];
}

export class DispatchTransferDto {
  @IsOptional()
  @IsDateString()
  dispatched_at?: string; // ISO time, default now()

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DispatchTransferLineDto)
  lines!: DispatchTransferLineDto[];

  @IsOptional()
  @IsString()
  remarks?: string;
}
