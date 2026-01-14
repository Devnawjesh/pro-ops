// src/modules/sales/entities/so_allocation_item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'so_allocation_item' })
@Index('uq_so_alloc_item', ['company_id', 'allocation_id', 'order_item_id'], { unique: true })
export class SoAllocationItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  allocation_id: string;

  @Column({ type: 'bigint' })
  order_item_id: string;

  @Column({ type: 'bigint' })
  sku_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 6 })
  qty_allocated: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, default: 0 })
  qty_invoiced: string;
}
