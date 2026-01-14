// src/modules/pricing/entities/scheme-rule.entity.ts
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { Scheme } from './scheme.entity';
import { MdSku } from 'src/modules/master/entities/md_sku.entity';

@Entity({ name: 'md_scheme_rule' })
@Index(['company_id', 'scheme_id', 'sort_order'], { unique: true })
@Index(['company_id', 'scheme_id'])
@Index(['buy_sku_id'])
@Index(['free_sku_id'])
export class SchemeRule extends BaseMasterEntity {
  @Column({ type: 'bigint' })
  scheme_id!: string;

  // Eligibility
  @Column({ type: 'bigint', nullable: true })
  buy_sku_id?: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true })
  min_qty?: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  min_amount?: string | null;

  // Reward
  @Column({ type: 'bigint', nullable: true })
  free_sku_id?: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true })
  free_qty?: string | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  discount_percent?: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  discount_amount?: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @ManyToOne(() => Scheme, (s) => s.rules, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheme_id' })
  scheme!: Scheme;

  @ManyToOne(() => MdSku, { nullable: true })
  @JoinColumn({ name: 'buy_sku_id' })
  buy_sku?: MdSku | null;

  @ManyToOne(() => MdSku, { nullable: true })
  @JoinColumn({ name: 'free_sku_id' })
  free_sku?: MdSku | null;
}
