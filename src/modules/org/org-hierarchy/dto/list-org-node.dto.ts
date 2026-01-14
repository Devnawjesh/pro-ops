import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { OrgLevel, Status } from '../../../../common/constants/enums';

const toOptionalInt = ({ value }: { value: any }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const v = value.trim();
    if (v === '') return undefined;          // ✅ empty => undefined
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof value === 'number') return value;
  return undefined;
};

export class ListOrgNodeDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsEnum(OrgLevel)
  level_no?: OrgLevel;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  parent_id?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  root_id?: string;
}
