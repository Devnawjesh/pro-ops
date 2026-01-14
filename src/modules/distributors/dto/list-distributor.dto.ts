// src/modules/master/distributor/dto/list-distributor.dto.ts
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min, IsBoolean } from 'class-validator';
import { Status, DistributorType } from 'src/common/constants/enums';

export class ListDistributorDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsEnum(Status)
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @IsEnum(DistributorType)
  distributor_type?: number;

  @IsOptional()
  @IsString()
  parent_distributor_id?: string;

  // show only currently effective records (recommended default true)
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_effective?: boolean = true;

  // include inactive records (otherwise status filter or active-only logic can apply)
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  include_inactive?: boolean = false;

  // include soft-deleted records (admin use)
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  include_deleted?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['id', 'code', 'name', 'created_at'])
  sort?: 'id' | 'code' | 'name' | 'created_at' = 'id';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
