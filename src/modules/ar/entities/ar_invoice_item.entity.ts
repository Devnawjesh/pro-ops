// src/modules/ar/entities/ar_invoice_item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'ar_invoice_item' })
@Index('uq_ar_invoice_item_line', ['company_id', 'invoice_id', 'line_no'], { unique: true })
export class ArInvoiceItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  invoice_id: string;

  @Column({ type: 'int' })
  line_no: number;

  @Column({ type: 'bigint' })
  sku_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 6 })
  qty: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  unit_price: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  line_discount: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  line_total: string;
}
