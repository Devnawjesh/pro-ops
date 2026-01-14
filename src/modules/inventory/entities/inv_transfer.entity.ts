import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvTransferItem } from './inv_transfer_item.entity';
import { BaseSoftDeleteEntity } from 'src/common/entities/base-softdelete.entity';

@Entity('inv_transfer')
@Index('uq_inv_transfer_no', ['company_id', 'transfer_no'], { unique: true })
@Index('ix_inv_transfer_status', ['company_id', 'status'])
export class InvTransfer extends BaseSoftDeleteEntity{
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column('bigint')
  company_id!: string;

  @Column('text')
  transfer_no!: string;

  @Column('date')
  transfer_date!: string;

  @Column('smallint', { default: () => '1' })
  status!: number;

  @Column('bigint')
  from_warehouse_id!: string;

  @Column('bigint')
  to_warehouse_id!: string;

  @Column('timestamptz', { nullable: true })
  dispatched_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  received_at!: Date | null;

  @OneToMany(() => InvTransferItem, (it) => it.transfer)
  items?: InvTransferItem[];
}
