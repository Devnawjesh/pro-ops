// src/modules/inventory/distributor-stock-policy/entities/inv-distributor-stock-policy.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum StockPolicyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// If your DB uses BIGINT IDs but your app uses string (DTO), this transformer helps.
export const BigintToStringTransformer = {
  to: (value?: string | number | null) => (value === null || value === undefined ? value : value),
  from: (value: any) => (value === null || value === undefined ? value : String(value)),
};

@Entity({ name: 'inv_distributor_stock_policy' })
@Index('ux_inv_dist_stock_policy_company_dist_sku', ['companyId', 'distributorId', 'skuId'], {
  unique: true,
  where: `"deleted_at" IS NULL`,
})
@Index('ix_inv_dist_stock_policy_company_dist', ['companyId', 'distributorId'], {
  where: `"deleted_at" IS NULL`,
})
@Index('ix_inv_dist_stock_policy_company_sku', ['companyId', 'skuId'], {
  where: `"deleted_at" IS NULL`,
})
export class InvDistributorStockPolicyEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string; // returned as string if BIGINT in pg driver

  @Column({ name: 'company_id', type: 'bigint', transformer: BigintToStringTransformer })
  companyId!: string;

  // distributor_id stored as BIGINT (string in DTO). If yours is TEXT/VARCHAR, change type accordingly.
  @Column({ name: 'distributor_id', type: 'bigint', transformer: BigintToStringTransformer })
  distributorId!: string;

  // sku_id type must match your md_sku.id / inv_stock_balance.sku_id. If yours is UUID, change to 'uuid'.
  @Column({ name: 'sku_id', type: 'bigint', transformer: BigintToStringTransformer })
  skuId!: string;

  @Column({ name: 'min_qty', type: 'numeric', nullable: true })
  minQty!: string | null; // numeric comes back as string in pg

  @Column({ name: 'max_qty', type: 'numeric', nullable: true })
  maxQty!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 16, default: StockPolicyStatus.ACTIVE })
  status!: StockPolicyStatus;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, transformer: BigintToStringTransformer })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true, transformer: BigintToStringTransformer })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
