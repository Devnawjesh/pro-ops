import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString() // bigint as string in API
  @IsNotEmpty()
  category_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // optional effective dates
  @IsOptional()
  @IsString()
  effective_from?: string; // 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  effective_to?: string; // 'YYYY-MM-DD'
}
