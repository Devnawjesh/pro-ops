import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ListDto } from '../list.dto';

export class ListLotDto extends ListDto {
  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  sku_id?: string;

  @IsOptional()
  @IsDateString()
  expiry_before?: string; // YYYY-MM-DD

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  only_available?: number; // 1 = qty_available > 0
}
