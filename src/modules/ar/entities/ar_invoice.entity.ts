// src/modules/ar/entities/ar_invoice.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'ar_invoice' })
@Index('uq_ar_invoice_no', ['company_id', 'invoice_no'], { unique: true })
@Index('ix_ar_invoice_status', ['company_id', 'status'])
export class ArInvoice {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'text' })
  invoice_no: string;

  @Column({ type: 'date' })
  invoice_date: string;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @Column({ type: 'bigint' })
  distributor_id: string;

  @Column({ type: 'bigint' })
  warehouse_id: string;

  @Column({ type: 'bigint' })
  created_by_user_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  gross_amount: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  discount_amount: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  net_amount: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}
