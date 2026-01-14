// src/modules/master/sku/dto/list-sku.dto.ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListSkuDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  brand_id?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  sub_category_id?: string;

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
  @IsIn(['code', 'name', 'created_at', 'updated_at'])
  sort_by?: 'code' | 'name' | 'created_at' | 'updated_at' = 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort_dir?: 'ASC' | 'DESC' = 'ASC';

  @IsOptional()
  @IsString()
  status?: string;
}
