import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

import { PriceList } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { PriceListScope } from './entities/price-list-scope.entity';
import { Scheme } from './entities/scheme.entity';
import { SchemeRule } from './entities/scheme-rule.entity';

import { MdSku } from '../master/entities/md_sku.entity';
import { MdDistributor } from '../distributors/entities/distributor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PriceList,
      PriceListItem,
      PriceListScope,
      Scheme,
      SchemeRule,
      MdSku,
      MdDistributor,
    ]),
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
