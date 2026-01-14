// src/modules/master/entities/md_category.entity.ts
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { MdSubCategory } from './md_sub_category.entity';

@Entity({ name: 'md_category' })
@Index('uq_md_category_company_code', ['company_id', 'code'], { unique: true })
export class MdCategory extends BaseMasterEntity {

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @OneToMany(() => MdSubCategory, (sc) => sc.category)
  sub_categories!: MdSubCategory[];
}
