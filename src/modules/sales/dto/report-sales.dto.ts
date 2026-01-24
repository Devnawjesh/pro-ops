import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const EmptyToUndefined = () =>
  Transform(({ value }) => (value === '' || value === null ? undefined : value));

export class ReportSalesDto {
  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  distributor_id?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  outlet_id?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  sku_id?: string;
}

export class ReportSalesDailySkuDto extends ReportSalesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 200;
}
