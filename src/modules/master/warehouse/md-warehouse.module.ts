// src/modules/master/warehouse/md-warehouse.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MdWarehouse } from '../entities/md_warehouse.entity';
import { MdWarehouseController } from './md-warehouse.controller';
import { MdWarehouseService } from './md-warehouse.service';
import { MdDistributor } from 'src/modules/distributors/entities/distributor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MdWarehouse,MdDistributor])],
  controllers: [MdWarehouseController],
  providers: [MdWarehouseService],
  exports: [MdWarehouseService],
})
export class MdWarehouseModule {}
