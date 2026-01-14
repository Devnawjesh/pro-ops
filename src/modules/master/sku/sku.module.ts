// src/modules/master/sku/sku.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MdSku } from '../entities/md_sku.entity';
import { MdBrand } from '../entities/md_brand.entity';
import { MdCategory } from '../entities/md_category.entity';
import { MdSubCategory } from '../entities/md_sub_category.entity';

import { SkuController } from './sku.controller';
import { SkuService } from './sku.service';

@Module({
  imports: [TypeOrmModule.forFeature([MdSku, MdBrand, MdCategory, MdSubCategory])],
  controllers: [SkuController],
  providers: [SkuService],
  exports: [SkuService],
})
export class SkuModule {}
