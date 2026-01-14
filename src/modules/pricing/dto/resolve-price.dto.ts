import { IsOptional, IsString } from 'class-validator';

export class ResolvePriceDto {
  @IsString()
  date!: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  distributor_id?: string;

  @IsOptional()
  outlet_type?: number;

  @IsOptional()
  @IsString()
  org_node_id?: string;

  @IsOptional()
  @IsString()
  sku_id?: string;

  @IsOptional()
  @IsString()
  sku_code?: string;
}
