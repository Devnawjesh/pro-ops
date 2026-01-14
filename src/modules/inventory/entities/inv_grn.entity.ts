// src/modules/inventory/entities/inv_grn.entity.ts
import { BaseSoftDeleteEntity } from 'src/common/entities/base-softdelete.entity';
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'inv_grn' })
@Index('uq_inv_grn_no', ['company_id', 'grn_no'], { unique: true })
@Index('ix_inv_grn_status', ['company_id', 'status'])
export class InvGrn extends BaseSoftDeleteEntity{
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'text' })
  grn_no: string;

  @Column({ type: 'date' })
  grn_date: string;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @Column({ type: 'bigint' })
  warehouse_id: string;

  @Column({ type: 'text', nullable: true })
  supplier_name: string | null;

  @Column({ type: 'text', nullable: true })
  reference_no: string | null;
}