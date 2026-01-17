import { IsArray, IsOptional, IsString, ValidateNested, IsNumberString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class OrderLineDto {
  @IsString()
  sku_id: string;

  @IsNumberString()
  qty: string;
}

export class CreateOrderDto {
  @IsString()
  order_date: string; // YYYY-MM-DD

  @IsString()
  outlet_id: string;

  @IsString()
  distributor_id: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}
