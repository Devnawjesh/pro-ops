// src/modules/inventory/distributor-stock-policy/distributor-stock-policy.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistributorStockPolicyService } from './distributor-stock-policy.service';
import { DistributorStockPolicyController } from './distributor-stock-policy.controller';
import { InvDistributorStockPolicyEntity } from './entities/distributor-stock-policy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InvDistributorStockPolicyEntity])],
  providers: [DistributorStockPolicyService],
  controllers: [DistributorStockPolicyController],
  exports: [DistributorStockPolicyService],
})
export class DistributorStockPolicyModule {}
