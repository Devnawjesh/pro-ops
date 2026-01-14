// src/modules/inventory/dto/stock/list-lot-stock.dto.ts
import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ListLotStockDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  sku_id?: string;

  @IsOptional()
  @IsString()
  batch_no?: string;

  @IsOptional()
  @IsDateString()
  expiry_from?: string;

  @IsOptional()
  @IsDateString()
  expiry_to?: string;

  @IsOptional()
  @IsString()
  q?: string; // search by sku_code/name
}
