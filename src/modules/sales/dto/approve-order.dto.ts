// src/modules/sales/dto/approve-order.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class ApproveOrderDto {
  @IsString()
  @IsOptional()
  remarks?: string;
}
