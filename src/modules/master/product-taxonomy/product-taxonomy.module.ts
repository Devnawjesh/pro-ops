import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductTaxonomyController } from './ product-taxonomy.controller';
import { ProductTaxonomyService } from './product-taxonomy.service';

import { MdBrand } from '../entities/md_brand.entity';
import { MdCategory } from '../entities/md_category.entity';
import { MdSubCategory } from '../entities/md_sub_category.entity';
import { Permission } from '../../users/entities/permission.entity';
import { RolePermission } from '../../users/entities/role-permission.entity';
import { MdSku } from '../entities/md_sku.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MdBrand, MdCategory, MdSubCategory, Permission, RolePermission, MdSku])],
  controllers: [ProductTaxonomyController],
  providers: [ProductTaxonomyService],
  exports: [ProductTaxonomyService],
})
export class ProductTaxonomyModule {}
