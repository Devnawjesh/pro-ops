// src/modules/master/route/dto/create-route.dto.ts
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRouteDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsString()
  territory_id!: string;

  @IsOptional()
  @IsInt()
  default_delivery_day?: number | null; // 0-6

  @IsOptional()
  @IsBoolean()
  is_delivery_route?: boolean;

  // ✅ effective dates
  @IsOptional()
  @IsDateString()
  effective_from?: string | null;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}