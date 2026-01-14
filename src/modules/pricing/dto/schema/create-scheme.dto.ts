import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { SchemeType, Status } from '../../../../common/constants/enums';

export class CreateSchemeDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  scheme_type!: SchemeType;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  can_stack?: boolean;

  @IsOptional()
  @IsString()
  distributor_id?: string | null;

  @IsOptional()
  outlet_type?: number | null;

  @IsOptional()
  @IsString()
  org_node_id?: string | null;

  @IsOptional()
  status?: Status;

  @IsOptional()
  effective_from?: string | null;

  @IsOptional()
  effective_to?: string | null;
}
