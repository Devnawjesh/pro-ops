// src/modules/inventory/distributor-stock-policy/dto/list-distributor-stock-policy.dto.ts
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StockPolicyStatus } from '../entities/distributor-stock-policy.entity';

export class ListDistributorStockPolicyDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  distributorId?: string;

  @IsOptional()
  @IsString()
  skuId?: string;

  @IsOptional()
  @IsEnum(StockPolicyStatus)
  status?: StockPolicyStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
