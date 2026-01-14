// src/modules/master/route/dto/update-route.dto.ts
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Status } from '../../../../common/constants/enums';

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  territory_id?: string;

  @IsOptional()
  @IsInt()
  default_delivery_day?: number | null;

  @IsOptional()
  @IsBoolean()
  is_delivery_route?: boolean;

  @IsOptional()
  @IsEnum(Status)
  @IsInt()
  status?: Status;

  // ✅ effective dates
  @IsOptional()
  @IsDateString()
  effective_from?: string | null;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;

  // ✅ inactivation metadata (optional; usually set automatically when status becomes INACTIVE)
  @IsOptional()
  @IsString()
  @MaxLength(250)
  inactivation_reason?: string | null;
}
