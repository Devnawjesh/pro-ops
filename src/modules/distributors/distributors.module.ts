// src/modules/master/distributor/distributor.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MdDistributor } from '../distributors/entities/distributor.entity';
import { DistributorService } from './distributor.service';
import { DistributorController } from './distributor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MdDistributor])],
  controllers: [DistributorController],
  providers: [DistributorService],
  exports: [DistributorService],
})
export class DistributorModule {}
