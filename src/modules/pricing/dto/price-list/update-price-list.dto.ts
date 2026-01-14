import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PriceListType } from '../../entities/price-list.entity';
import { Status } from '../../../../common/constants/enums';

export class UpdatePriceListDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEnum(PriceListType)
  price_list_type?: PriceListType;

  @IsOptional()
  @IsString()
  remarks?: string | null;

  @IsOptional()
  status?: Status;
}
