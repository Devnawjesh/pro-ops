import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrgLevel } from '../../../../common/constants/enums';

export class OrgTreeQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const v = value.trim();
      if (v === '') return undefined;     // ✅ level_no= -> undefined
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }
    return value;
  })
  @IsEnum(OrgLevel) // ✅ validates allowed levels (1..5)
  level_no?: OrgLevel;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  root_id?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    const v = String(value).toLowerCase().trim();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
    return undefined;
  })
  include_routes?: boolean;
}
