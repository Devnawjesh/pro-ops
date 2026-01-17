import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

import { SoOrder } from './entities/so_order.entity';
import { SoOrderItem } from './entities/so_order_item.entity';
import { SoAllocation } from './entities/so_allocation.entity';
import { SoAllocationItem } from './entities/so_allocation_item.entity';
import { SoAllocationLot } from './entities/so_allocation_lot.entity';

import { PricingModule } from '../pricing/pricing.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SoOrder, SoOrderItem, SoAllocation, SoAllocationItem, SoAllocationLot]),
    PricingModule,
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class SalesModule {}
