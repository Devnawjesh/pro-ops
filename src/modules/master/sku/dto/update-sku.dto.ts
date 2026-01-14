// src/modules/master/sku/dto/update-sku.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSkuDto } from './create-sku.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSkuDto extends PartialType(CreateSkuDto) {
  @IsOptional()
  @IsString()
  inactivation_reason?: string | null;
}
