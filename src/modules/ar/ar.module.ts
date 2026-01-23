import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ArController } from './ar.controller';
import { ArService } from './ar.service';
import { ArInvoice } from './entities/ar_invoice.entity';
import { ArInvoiceItem } from './entities/ar_invoice_item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArInvoice, ArInvoiceItem])],
  controllers: [ArController],
  providers: [ArService],
})
export class ArModule {}
