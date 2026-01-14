// src/modules/master/entities/md_sub_category.entity.ts
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { MdCategory } from './md_category.entity';
import { MdSku } from './md_sku.entity';

@Entity({ name: 'md_sub_category' })
@Index('uq_md_sub_category_company_code', ['company_id', 'code'], { unique: true })
@Index('ix_md_sub_category_company_category', ['company_id', 'category_id'])
export class MdSubCategory extends BaseMasterEntity {
  @Column({ type: 'bigint' })
  category_id!: string;

  @ManyToOne(() => MdCategory, (c) => c.sub_categories, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: MdCategory;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @OneToMany(() => MdSku, (sku) => sku.sub_category)
    skus!: MdSku[];

}
