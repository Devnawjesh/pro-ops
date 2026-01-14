// src/modules/sales/entities/so_allocation_lot.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'so_allocation_lot' })
@Index('uq_so_alloc_lot', ['company_id', 'allocation_item_id', 'lot_id'], { unique: true })
export class SoAllocationLot {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  allocation_item_id: string;

  @Column({ type: 'bigint' })
  lot_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 6 })
  qty_reserved: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, default: 0 })
  qty_consumed: string;
}
