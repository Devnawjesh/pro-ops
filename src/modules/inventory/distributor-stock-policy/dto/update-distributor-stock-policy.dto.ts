// src/modules/inventory/distributor-stock-policy/dto/update-distributor-stock-policy.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDistributorStockPolicyDto } from './create-distributor-stock-policy.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDistributorStockPolicyDto extends PartialType(CreateDistributorStockPolicyDto) {
  // If you don’t want companyId/distributorId/skuId to be mutable, enforce it here by omitting them.
  @IsOptional()
  @IsString()
  updatedBy?: string;
}
