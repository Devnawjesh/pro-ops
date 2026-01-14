import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListSchemeDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  scheme_type?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  distributor_id?: string;

  @Transform(({ value }) => Number(value ?? 1))
  @IsInt()
  @Min(1)
  page: number = 1;

  @Transform(({ value }) => Number(value ?? 20))
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 20;
}
