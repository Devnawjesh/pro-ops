import { IsArray, IsOptional, IsString, ValidateNested, IsNumberString, IsInt, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

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

 @IsOptional()
  @Transform(({ value }) => {
    const v = String(value ?? '').trim().toLowerCase();
    return v === 'true' || v === '1';
  })
  @IsBoolean()
  submit_now?: boolean;
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}
