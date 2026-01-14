import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BigIntTransformer } from '../transformers/bigint.transformer';
import { Status } from '../constants/enums';

export abstract class BaseMasterEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index()
  @Column({ type: 'bigint', transformer: BigIntTransformer })
  company_id!: string;

  @Column({ type: 'text' })
  code!: string;

  @Column({ type: 'text' })
  name!: string;

  @Index()
  @Column({ type: 'smallint', default: Status.ACTIVE })
  status!: number;

  @Column({ type: 'date', nullable: true })
  effective_from?: string | null;

  @Column({ type: 'date', nullable: true })
  effective_to?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  inactivated_at?: Date | null;

  @Column({ type: 'text', nullable: true })
  inactivation_reason?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  created_by?: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  updated_by?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at?: Date | null;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  deleted_by?: string | null;
}