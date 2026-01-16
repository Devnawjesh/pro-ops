// src/modules/pricing/dto/visible/list-visible.dto.ts
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListVisibleDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional() @IsString()
  distributor_id?: string;

  @IsOptional() @IsString()
  org_node_id?: string;

  @IsOptional() @IsInt() @Type(() => Number)
  outlet_type?: number;

  @IsOptional() @IsString()
  q?: string;

  @IsOptional() @IsInt() @Type(() => Number) @Min(1)
  page?: number = 1;

  @IsOptional() @IsInt() @Type(() => Number) @Min(1)
  limit?: number = 50;
}
