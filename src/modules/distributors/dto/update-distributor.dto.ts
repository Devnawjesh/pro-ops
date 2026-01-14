// src/modules/master/distributor/dto/update-distributor.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDistributorDto } from './create-distributor.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Status } from 'src/common/constants/enums';

export class UpdateDistributorDto extends PartialType(CreateDistributorDto) {
  // allow status change via update endpoint if you want
  @IsOptional()
  @IsEnum(Status)
  status?: number;

  // optional: allow providing inactivation reason in update (not required)
  @IsOptional()
  @IsString()
  inactivation_reason?: string | null;
}
