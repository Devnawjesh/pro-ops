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
 * Receive:
 * - create inv_txn IN into to_warehouse_id
 * - increase qty_received_total on transfer_item
 *
 * Note: Without in-transit, you must enforce:
 * received_total <= dispatched_total
 */
export class ReceiveTransferLineDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  line_no!: number;

  @IsString()
  qty_receive!: string;

  // if you want to create new lots in destination, you can accept batch/expiry here
  @IsOptional()
  @IsString()
  batch_no?: string | null;

  @IsOptional()
  @IsDateString()
  expiry_date?: string | null; // YYYY-MM-DD
}

export class ReceiveTransferDto {
  @IsOptional()
  @IsDateString()
  received_at?: string; // ISO time, default now()

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveTransferLineDto)
  lines!: ReceiveTransferLineDto[];

  @IsOptional()
  @IsString()
  remarks?: string;
}
