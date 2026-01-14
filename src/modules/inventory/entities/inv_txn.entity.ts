// src/modules/inventory/entities/inv_txn.entity.ts
import { BaseSoftDeleteEntity } from 'src/common/entities/base-softdelete.entity';
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity({ name: 'inv_txn' })
@Index('ix_inv_txn_key', ['company_id', 'warehouse_id', 'sku_id', 'txn_time'])
@Index('ix_inv_txn_ref', ['company_id', 'ref_doc_type', 'ref_doc_id'])
export class InvTxn{
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'timestamptz' })
  txn_time: Date;

  @Column({ type: 'smallint' })
  txn_type: number;

  @Column({ type: 'bigint' })
  warehouse_id: string;

  @Column({ type: 'bigint' })
  sku_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, default: 0 })
  qty_in: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, default: 0 })
  qty_out: string;

  @Column({ type: 'smallint' })
  ref_doc_type: number;

  @Column({ type: 'bigint' })
  ref_doc_id: string;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column('bigint')
  created_by!: string;
}
