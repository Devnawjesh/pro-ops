import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PriceListType } from '../../entities/price-list.entity';

export class CreatePriceListDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsEnum(PriceListType)
  price_list_type!: PriceListType;

  @IsOptional()
  @IsString()
  remarks?: string | null;
}
