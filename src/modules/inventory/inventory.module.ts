// src/modules/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryCommonService } from './inventory-common.service';
import { GrnService } from './grn.service';
import { StockService } from './stock.service';
import { TransferService } from './transfer.service';

import { GrnController } from './controllers/grn.controller';
import { StockController } from './controllers/stock.controller';
import { TransferController } from './controllers/transfer.controller';

import { InvGrn } from './entities/inv_grn.entity';
import { InvGrnItem } from './entities/inv_grn_item.entity';
import { InvTransfer } from './entities/inv_transfer.entity';
import { InvTransferItem } from './entities/inv_transfer_item.entity';
import { InvStockBalance } from './entities/inv_stock_balance.entity';
import { InvTxn } from './entities/inv_txn.entity';
import { InvTxnLot } from './entities/inv_txn_lot.entity';
import { InvLot } from './entities/inv_lot.entity';

import { MdWarehouse } from '../master/entities/md_warehouse.entity';
import { PricingModule } from '../pricing/pricing.module';
import { ArInvoice } from '../ar/entities/ar_invoice.entity';
import { ArInvoiceItem } from '../ar/entities/ar_invoice_item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvGrn,
      InvGrnItem,
      InvTransfer,
      InvTransferItem,
      InvStockBalance,
      InvTxn,
      InvTxnLot,
      InvLot,
      MdWarehouse,
      ArInvoice,
      ArInvoiceItem,
    ]),
    PricingModule,
  ],
  controllers: [GrnController, StockController, TransferController],
  providers: [InventoryCommonService, GrnService, StockService, TransferService],
  exports: [GrnService, StockService, TransferService, InventoryCommonService],
})
export class InventoryModule {}
