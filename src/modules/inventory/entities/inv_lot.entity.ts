// src/modules/inventory/entities/inv_lot.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'inv_lot' })
@Index('ix_inv_lot_fifo', ['company_id', 'warehouse_id', 'sku_id', 'received_at'])
@Index('ix_inv_lot_avail', ['company_id', 'warehouse_id', 'sku_id', 'qty_available'])
export class InvLot {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  warehouse_id: string;

  @Column({ type: 'bigint' })
  sku_id: string;

  @Column({ type: 'smallint' })
  source_doc_type: number;

  @Column({ type: 'bigint' })
  source_doc_id: string;

  @Column({ type: 'timestamptz' })
  received_at: Date;

  @Column({ type: 'text', nullable: true })
  batch_no: string | null;

  @Column({ type: 'date', nullable: true })
  expiry_date: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  unit_cost: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 6 })
  qty_received: string;

  @Column({ type: 'numeric', precision: 18, scale: 6 })
  qty_available: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}
