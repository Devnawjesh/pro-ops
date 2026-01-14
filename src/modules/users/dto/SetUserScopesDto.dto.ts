import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsEnum, IsOptional, IsString } from 'class-validator';
import { ScopeType } from 'src/common/constants/enums';

class ScopeRowDto {
  @IsEnum(ScopeType)
  scope_type!: ScopeType;

  @IsOptional() @IsString()
  org_node_id?: string | null;

  @IsOptional() @IsString()
  route_id?: string | null;

  @IsOptional() @IsString()
  distributor_id?: string | null;
}

export class SetUserScopesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeRowDto)
  scopes!: ScopeRowDto[];
}
