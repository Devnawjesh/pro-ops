// src/modules/inventory/distributor-stock-policy/dto/create-distributor-stock-policy.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { StockPolicyStatus } from '../entities/distributor-stock-policy.entity';

export class CreateDistributorStockPolicyDto {
  @IsNotEmpty()
  @IsString()
  companyId!: string;

  @IsNotEmpty()
  @IsString()
  distributorId!: string;

  @IsNotEmpty()
  @IsString()
  skuId!: string;

  // Keep numeric as string to avoid float issues; validate as decimal-ish string
  @IsOptional()
  @Matches(/^\d+(\.\d+)?$/, { message: 'minQty must be numeric' })
  minQty?: string | null;

  @IsOptional()
  @Matches(/^\d+(\.\d+)?$/, { message: 'maxQty must be numeric' })
  maxQty?: string | null;

  @IsOptional()
  @IsEnum(StockPolicyStatus)
  status?: StockPolicyStatus;
}
