// src/modules/master/entities/md_outlet_org.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BigIntTransformer } from '../../../common/transformers/bigint.transformer';
import { Status } from '../../../common/constants/enums';

@Entity({ name: 'md_outlet_org' })
@Index('uq_md_outlet_org_hist', ['company_id', 'outlet_id', 'effective_from'], { unique: true })
@Index('ix_md_outlet_org_node', ['company_id', 'org_node_id'])
@Index('ix_md_outlet_org_outlet', ['company_id', 'outlet_id'])
export class MdOutletOrg {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  company_id!: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  outlet_id!: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  org_node_id!: string;

  @Column({ type: 'date' })
  effective_from!: string;

  @Column({ type: 'date', nullable: true })
  effective_to!: string | null;

  @Column({ type: 'smallint', default: Status.ACTIVE })
  status!: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  created_by!: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  updated_by!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  deleted_by!: string | null;
}
