// src/modules/inventory/entities/inv_transfer_item.entity.ts
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { InvTransfer } from './inv_transfer.entity';

@Entity('inv_transfer_item')
@Index('uq_inv_transfer_item_line', ['company_id', 'transfer_id', 'line_no'], { unique: true })
export class InvTransferItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column('bigint')
  company_id!: string;

  @Column('bigint')
  transfer_id!: string;

  @ManyToOne(() => InvTransfer, (t) => t.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transfer_id' })
  transfer!: InvTransfer;

  @Column('int')
  line_no!: number;

  @Column('bigint')
  sku_id!: string;

  @Column('numeric', { precision: 18, scale: 6 })
  qty_planned!: string;

  @Column('numeric', { precision: 18, scale: 2, nullable: true })
  dp_price!: string | null;

  @Column('numeric', { precision: 18, scale: 6, default: () => '0' })
  qty_dispatched_total!: string;

  @Column('numeric', { precision: 18, scale: 6, default: () => '0' })
  qty_received_total!: string;
}
