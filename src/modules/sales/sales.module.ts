import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './orders.controller';
import { SalesReportsController } from './reports.controller';
import { OrdersService } from './orders.service';

import { SoOrder } from './entities/so_order.entity';
import { SoOrderItem } from './entities/so_order_item.entity';
import { SoAllocation } from './entities/so_allocation.entity';

import { PricingModule } from '../pricing/pricing.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SoOrder, SoOrderItem, SoAllocation]),
    PricingModule,
    InventoryModule,
  ],
  controllers: [OrdersController, SalesReportsController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class SalesModule {}
