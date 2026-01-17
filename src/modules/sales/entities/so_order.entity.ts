// src/modules/sales/entities/so_order.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'so_order' })
@Index('uq_so_order_no', ['company_id', 'order_no'], { unique: true })
@Index('ix_so_order_status', ['company_id', 'status'])
@Index('ix_so_order_org', ['company_id', 'org_node_id'])
@Index('ix_so_order_outlet', ['company_id', 'outlet_id'])
export class SoOrder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'text' })
  order_no: string;

  @Column({ type: 'date' })
  order_date: string;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @Column({ type: 'bigint' })
  outlet_id: string;

  @Column({ type: 'bigint' })
  distributor_id: string;

  @Column({ type: 'bigint', nullable: true })
  org_node_id: string | null;

  @Column({ type: 'smallint', nullable: true })
  outlet_type: number | null;

  @Column({ type: 'bigint' })
  created_by_user_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date | null;

  @Column({ type: 'bigint', nullable: true })
  submitted_by_user_id: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'bigint', nullable: true })
  approved_by_user_id: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  rejected_at: Date | null;

  @Column({ type: 'bigint', nullable: true })
  rejected_by_user_id: string | null;

  @Column({ type: 'text', nullable: true })
  reject_reason: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  gross_amount: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  discount_amount: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  net_amount: string;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}
