import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ListDto } from './list.dto';
import { GrnStatus } from './grn-status.enum';

const EmptyToUndefined = () =>
  Transform(({ value }) => (value === '' || value === null ? undefined : value));

export class ListGrnDto extends ListDto {
  @IsOptional()
  @IsString()
  @EmptyToUndefined()
  warehouse_id?: string;

  @IsOptional()
  @Transform(({ value }) => {
    // drop empty values
    if (value === '' || value === null || value === undefined) return undefined;

    // convert string -> number safely
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsEnum(GrnStatus)
  status?: GrnStatus;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  to_date?: string;
}
