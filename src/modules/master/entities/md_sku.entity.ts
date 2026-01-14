// src/modules/master/entities/md_sku.entity.ts
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { MdBrand } from './md_brand.entity';
import { MdCategory } from './md_category.entity';
import { MdSubCategory } from './md_sub_category.entity';

@Entity({ name: 'md_sku' })
@Index('uq_md_sku_company_code', ['company_id', 'code'], { unique: true })
@Index('ix_md_sku_company_brand', ['company_id', 'brand_id'])
@Index('ix_md_sku_company_category', ['company_id', 'category_id'])
@Index('ix_md_sku_company_sub_category', ['company_id', 'sub_category_id'])
export class MdSku extends BaseMasterEntity {
  // ===== normalized foreign keys =====

  @Column({ type: 'bigint', nullable: true })
  brand_id!: string | null;

  @ManyToOne(() => MdBrand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand!: MdBrand | null;

  @Column({ type: 'bigint', nullable: true })
  category_id!: string | null;

  @ManyToOne(() => MdCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category!: MdCategory | null;

  @Column({ type: 'bigint', nullable: true })
  sub_category_id!: string | null;

  @ManyToOne(() => MdSubCategory, (sc) => sc.skus, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sub_category_id' })
  sub_category!: MdSubCategory | null;

  // ===== sku-specific columns =====

  @Column({ type: 'text', nullable: true })
  pack_size!: string | null;

  @Column({ type: 'text' })
  base_uom!: string;

  @Column({ type: 'text' })
  sales_uom!: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, default: 1 })
  conversion_to_base!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  mrp!: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  tax_rate!: string;

  @Column({ type: 'boolean', default: false })
  is_batch_tracked!: boolean;

  @Column({ type: 'boolean', default: false })
  is_expiry_tracked!: boolean;
}
