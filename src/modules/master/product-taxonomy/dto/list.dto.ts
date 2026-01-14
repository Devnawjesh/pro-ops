import { IsOptional, IsInt, Min, IsString, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  // NEW
  @IsOptional()
  @IsBooleanString()
  include_inactive?: string; // "true"/"false"

  @IsOptional()
  @IsBooleanString()
  include_deleted?: string; // admin only if you want
}
