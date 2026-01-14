// src/modules/master/entities/md_brand.entity.ts
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { MdSku } from './md_sku.entity';

@Entity({ name: 'md_brand' })
@Index('uq_md_brand_company_code', ['company_id', 'code'], { unique: true })
export class MdBrand extends BaseMasterEntity {
    
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @OneToMany(() => MdSku, (sku) => sku.brand)
  skus!: MdSku[];
}
