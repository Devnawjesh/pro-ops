// src/modules/ar/entities/ar_invoice_order.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'ar_invoice_order' })
@Index('uq_ar_invoice_order', ['company_id', 'invoice_id', 'order_id'], { unique: true })
export class ArInvoiceOrder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  invoice_id: string;

  @Column({ type: 'bigint' })
  order_id: string;
}
