import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Status } from '../../../../common/constants/enums';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  legal_name?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  status?: Status;
}
