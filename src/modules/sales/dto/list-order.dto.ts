import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ListOrderDto {
  @Type(() => Number)
  @IsInt()
  page = 1;

  @Type(() => Number)
  @IsInt()
  limit = 50;

  @IsOptional() @IsString()
  q?: string;

  @IsOptional() @IsString()
  outlet_id?: string;

  @IsOptional() @IsString()
  distributor_id?: string;

  @IsOptional() @IsString()
  org_node_id?: string;

  @IsOptional() @IsString()
  from_date?: string;

  @IsOptional() @IsString()
  to_date?: string;

  @IsOptional() @IsString()
  status?: string; // number string
}
