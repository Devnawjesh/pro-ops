// src/modules/inventory/dto/report-grn-items.dto.ts
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ListDto } from './list.dto';

const EmptyToUndefined = () =>
  Transform(({ value }) => (value === '' || value === null ? undefined : value));

export class ReportGrnItemsDto extends ListDto {
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
  warehouse_id?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  sku_id?: string;

  @IsOptional()
@EmptyToUndefined()
@IsString()
search?: string;

}
