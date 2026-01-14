// src/modules/inventory/entities/inv_stock_balance.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'inv_stock_balance' })
@Index('uq_inv_stock_balance', ['company_id', 'warehouse_id', 'sku_id'], { unique: true })
export class InvStockBalance {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  warehouse_id: string;

  @Column({ type: 'bigint' })
  sku_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, default: 0 })
  qty_on_hand: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, default: 0 })
  qty_reserved: string;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}
