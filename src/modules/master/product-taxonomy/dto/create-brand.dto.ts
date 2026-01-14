import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

    // optional effective dates
  @IsOptional()
  @IsString()
  effective_from?: string; // 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  effective_to?: string; // 'YYYY-MM-DD'
}
