import { IsString } from 'class-validator';

export class RejectOrderDto {
  @IsString()
  reason: string;
}
