// src/modules/sales/entities/so_allocation.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity({ name: 'so_allocation' })
@Index('uq_so_allocation_order', ['company_id', 'order_id'], { unique: true })
export class SoAllocation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  order_id: string;

  @Column({ type: 'bigint' })
  warehouse_id: string;

  @Column({ type: 'timestamptz' })
  allocated_at: Date;

  @Column({ type: 'bigint', nullable: true })
  allocated_by_user_id: string | null;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;
}
