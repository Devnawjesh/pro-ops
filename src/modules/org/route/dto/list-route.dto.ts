import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { Status } from '../../../../common/constants/enums';

const toOptionalBool = ({ value }: { value: any }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;

  const v = String(value).trim().toLowerCase();
  if (v === '') return undefined;
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;

  return undefined; // invalid values become undefined (or throw if you prefer)
};

const toOptionalString = ({ value }: { value: any }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? undefined : v;
};

const toOptionalInt = ({ value }: { value: any }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;

  const v = String(value).trim();
  if (v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export class ListRouteDto extends PaginationDto {
  @IsOptional()
  @Transform(toOptionalString)
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(toOptionalString)
  territory_id?: string;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @Transform(toOptionalBool)
  is_delivery_route?: boolean;
}
