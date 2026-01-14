import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { buildTypeOrmOptions } from './database/typeorm.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SeedModule } from './seed/seed.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { OrgModule } from './modules/org/org.module';
import { ProductTaxonomyModule } from './modules/master/product-taxonomy/product-taxonomy.module';
import { SkuModule } from './modules/master/sku/sku.module';
import { MdWarehouseModule } from './modules/master/warehouse/md-warehouse.module';
import { DistributorModule } from './modules/distributors/distributors.module';
import { OutletModule } from './modules/master/outlet/outlet.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { InventoryModule } from './modules/inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        buildTypeOrmOptions({
          host: cfg.get<string>('DB_HOST')!,
          port: Number(cfg.get<string>('DB_PORT') || 5432),
          username: cfg.get<string>('DB_USER')!,
          password: cfg.get<string>('DB_PASS')!,
          name: cfg.get<string>('DB_NAME')!,
          ssl: cfg.get<string>('DB_SSL') === 'true',
        }),
    }),
  AuthModule,
  UsersModule,
  OrgModule,
  DistributorModule,
  SeedModule,
  ProductTaxonomyModule,
  SkuModule,
  MdWarehouseModule,
  OrgModule,
  OutletModule,
  PricingModule,
  InventoryModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}