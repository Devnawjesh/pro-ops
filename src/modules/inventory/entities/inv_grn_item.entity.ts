import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvGrn } from './inv_grn.entity';

@Entity('inv_grn_item')
@Index('uq_inv_grn_item_line', ['company_id', 'grn_id', 'line_no'], { unique: true })
export class InvGrnItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column('bigint')
  company_id!: string;

  @Column('bigint')
  grn_id!: string;

  @ManyToOne(() => InvGrn, (grn: any) => grn.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'grn_id' })
  grn?: InvGrn;

  @Column('int')
  line_no!: number;

  @Column('bigint')
  sku_id!: string;

  @Column('numeric', { precision: 18, scale: 6 })
  qty_expected!: string;

  @Column('numeric', { precision: 18, scale: 6, default: () => '0' })
  qty_received_total!: string;

  @Column('numeric', { precision: 18, scale: 4, nullable: true })
  unit_cost!: string | null;
}
