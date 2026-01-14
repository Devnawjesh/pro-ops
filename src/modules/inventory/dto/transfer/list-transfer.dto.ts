import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ListDto } from '../list.dto';
import { TransferStatus } from './transfer-status.enum';

export class ListTransferDto extends ListDto {
  @IsOptional()
  @Type(() => Number)
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  @IsOptional()
  @IsString()
  from_warehouse_id?: string;

  @IsOptional()
  @IsString()
  to_warehouse_id?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;
}