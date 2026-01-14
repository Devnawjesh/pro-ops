import { IsArray, IsOptional, IsString } from 'class-validator';

export class ApplySchemeDto {
  @IsString()
  date!: string;

  @IsOptional()
  @IsString()
  distributor_id?: string;

  @IsOptional()
  outlet_type?: number;

  @IsOptional()
  @IsString()
  org_node_id?: string;

  @IsArray()
  lines!: Array<{
    sku_id: string;
    qty: number;
    unit_price: string; // decimal string
  }>;
}
