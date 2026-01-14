// src/modules/inventory/entities/inv_txn_lot.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'inv_txn_lot' })
@Index('uq_inv_txn_lot', ['company_id', 'inv_txn_id', 'lot_id'], { unique: true })
export class InvTxnLot {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  inv_txn_id: string;

  @Column({ type: 'bigint' })
  lot_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 6 })
  qty: string;
}
