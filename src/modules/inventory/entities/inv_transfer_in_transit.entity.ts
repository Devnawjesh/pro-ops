// src/modules/inventory/entities/inv_transfer_in_transit.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'inv_transfer_in_transit' })
@Index('uq_inv_transfer_transit_line', ['company_id', 'transfer_item_id'], { unique: true })
@Index('ix_inv_transfer_transit_by_transfer', ['company_id', 'transfer_id'])
@Index('ix_inv_transfer_transit_by_route', ['company_id', 'from_warehouse_id', 'to_warehouse_id'])
export class InvTransferInTransit {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  transfer_id: string;

  @Column({ type: 'bigint' })
  transfer_item_id: string;

  @Column({ type: 'bigint' })
  from_warehouse_id: string;

  @Column({ type: 'bigint' })
  to_warehouse_id: string;

  @Column({ type: 'bigint' })
  sku_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, default: 0 })
  qty_dispatched: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, default: 0 })
  qty_received: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}
