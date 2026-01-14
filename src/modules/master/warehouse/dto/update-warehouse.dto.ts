// src/modules/master/warehouse/dto/update-warehouse.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateWarehouseDto } from './create-warehouse.dto';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {
  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  inactivation_reason?: string | null;
}
