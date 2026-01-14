// src/modules/inventory/dto/stock/list-stock.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListStockDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  q?: string; // search by sku code/name if you implement it in query

  // =========================
  // Filters
  // =========================

  @IsOptional()
  @IsString()
  warehouse_id?: string; // direct warehouse filter (admin/system or distributor scope)

  @IsOptional()
  @IsString()
  sku_id?: string;

  @IsOptional()
  @IsString()
  distributor_id?: string; // hierarchy user/admin can filter by distributor

  @IsOptional()
  @IsString()
  sub_distributor_id?: string; // if you support sub-distributor ownership separately

  @IsOptional()
  @IsString()
  org_node_id?: string; // hierarchy filter (HOS/DIV/REGION/AREA/TERRITORY) - service must verify access

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  include_zero?: number = 0; // 1 = include zero qty rows

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  only_available?: number = 1; // 1 = qty_on_hand > 0 (default), 0 = show all (subject to include_zero)

  // Sorting (optional)
  @IsOptional()
  @IsString()
  sort_by?: 'sku' | 'qty_on_hand' | 'updated_at';

  @IsOptional()
  @IsString()
  sort_dir?: 'ASC' | 'DESC';
}
