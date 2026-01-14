// src/modules/master/warehouse/dto/list-warehouse.dto.ts
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class ListWarehouseDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  owner_type?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @Matches(/^\d+$/, { message: 'owner_id must be a numeric string' })
  owner_id?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  status?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 1 : Number(value)))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 20 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsIn(['code', 'name', 'created_at', 'updated_at', 'status'])
  sort_by?: 'code' | 'name' | 'created_at' | 'updated_at' | 'status' = 'updated_at';

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsIn(['ASC', 'DESC'])
  sort_dir?: 'ASC' | 'DESC' = 'DESC';
}
