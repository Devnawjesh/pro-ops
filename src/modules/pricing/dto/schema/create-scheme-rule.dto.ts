import { IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator';

export class CreateSchemeRuleDto {
  @IsOptional()
  @IsString()
  buy_sku_id?: string | null;

  @IsOptional()
  @IsNumberString()
  min_qty?: string | null;

  @IsOptional()
  @IsNumberString()
  min_amount?: string | null;

  @IsOptional()
  @IsString()
  free_sku_id?: string | null;

  @IsOptional()
  @IsNumberString()
  free_qty?: string | null;

  @IsOptional()
  @IsNumberString()
  discount_percent?: string | null;

  @IsOptional()
  @IsNumberString()
  discount_amount?: string | null;

  @IsInt()
  @Min(1)
  sort_order!: number;
}
